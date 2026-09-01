import { unstable_cache } from "next/cache";
import { createClient } from "./supabase/server";
import { createTokenScopedClient } from "./supabase/token-scoped";
import type { Member } from "./members";
import type { Sale, CommissionEntry } from "./commissions";
import { computeRanks, type Rank } from "./rank";
import { MOCK_MEMBERS } from "./mock-members";
import { MOCK_SALES } from "./mock-sales";
import { allCommissionEntries } from "./dashboard-data";

export type NetworkData = {
  members: Member[];
  sales: Sale[];
  entries: CommissionEntry[];
  ranks: Record<number, Rank>;
  usingMockData: boolean;
  // true solo quando Supabase è configurato e l'utente è autenticato ma il
  // caricamento è comunque fallito (sessione/token non valido, query in
  // errore). Va distinto da usingMockData: qui NON si mostrano dati finti
  // all'utente vero, solo un avviso che il caricamento è fallito.
  loadFailed: boolean;
};

type RawNetwork = {
  members: Member[];
  sales: Sale[];
  entries: CommissionEntry[];
  ranks: Record<number, Rank>;
} | null;

// Cache-abile: riceve l'access token già risolto (dentro unstable_cache non
// si possono leggere i cookie della richiesta) e interroga Supabase come
// quello specifico utente, quindi la RLS applica lo stesso scoping al
// sotto-albero di sempre — nessuna riscrittura della logica di visibilità,
// nessun bypass. Il token è un argomento della funzione cache-abile, quindi
// fa parte della chiave di cache: sessioni/utenti diversi non condividono
// mai risultati tra loro. Tag "network-data": invalidato via revalidateTag
// da ogni azione che crea vendite/iscrizioni (enroll_member, register_sale,
// complete_registration) e da chi tocca il rank (admin_set_rank_override).
// revalidate:60 è solo una rete di sicurezza nel caso ci si dimentichi di
// invalidare da qualche punto futuro.
//
// I rank vengono presi dalla vista member_ranks (motore reale nel DB,
// compute_member_ranks()) invece che ricalcolati lato client: la vecchia
// funzione computeRanks() in ./rank è rimasta ferma alle regole pre-0026
// (VIP/Royal calcolati diversamente da come funziona oggi davvero) ed è
// tenuta in vita solo per il fallback dati demo, dove non c'è un DB da
// interrogare. Usare la vista reale qui garantisce anche che un eventuale
// rank forzato a mano dal Centro di controllo (member_rank_overrides)
// compaia coerentemente ovunque nell'app, non solo lì.
const getCachedNetwork = unstable_cache(
  async (accessToken: string): Promise<RawNetwork> => {
    const supabase = createTokenScopedClient(accessToken);

    const [
      { data: members, error: membersError },
      { data: sales, error: salesError },
      { data: entries, error: entriesError },
      { data: rankRows, error: ranksError },
    ] = await Promise.all([
      supabase.from("members").select("*").order("activity_code", { ascending: true }),
      supabase.from("sales").select("*").order("created_at", { ascending: true }),
      supabase.from("commission_entries").select("*").order("created_at", { ascending: true }),
      supabase.from("member_ranks").select("activity_code, rank"),
    ]);

    // IMPORTANTE: qui si LANCIA invece di restituire null. unstable_cache
    // memorizza qualunque valore ritornato, null compreso: restituendolo, un
    // singolo intoppo di un istante (es. token in fase di rinnovo) resterebbe
    // in cache per 60 secondi e l'utente vedrebbe l'errore per un minuto
    // intero anche a problema gia' risolto. Un'eccezione invece non viene
    // memorizzata: il tentativo successivo riparte pulito.
    if (membersError || salesError || entriesError || ranksError || !members || members.length === 0) {
      const causa = membersError?.message
        ?? salesError?.message
        ?? entriesError?.message
        ?? ranksError?.message
        ?? "members: nessuna riga restituita per questo utente";
      console.error("[load-network-data]", causa);
      throw new Error(causa);
    }

    const ranks: Record<number, Rank> = {};
    for (const row of rankRows ?? []) {
      ranks[row.activity_code] = row.rank as Rank;
    }

    return {
      members: members as Member[],
      sales: (sales ?? []) as Sale[],
      entries: (entries ?? []) as CommissionEntry[],
      ranks,
    };
  },
  ["network-data"],
  { tags: ["network-data"], revalidate: 60 },
);

function mockRanks(): Record<number, Rank> {
  return Object.fromEntries(computeRanks(MOCK_MEMBERS));
}

// Carica members/sales/commission_entries per l'utente loggato (scoped al
// proprio sotto-albero via RLS), con fallback ai dati mock in modalità demo
// o se Supabase non è ancora collegato. Condiviso tra Dashboard e Payout.
export async function loadNetworkData(): Promise<NetworkData> {
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Modalità demo vera: nessun Supabase configurato (solo sviluppo locale
  // senza .env.local). Qui è corretto mostrare dati finti con l'avviso.
  if (!supabaseConfigured) {
    return {
      members: MOCK_MEMBERS,
      sales: MOCK_SALES,
      entries: allCommissionEntries(MOCK_MEMBERS, MOCK_SALES),
      ranks: mockRanks(),
      usingMockData: true,
      loadFailed: false,
    };
  }

  // Da qui in poi Supabase è configurato: un fallimento è un problema vero,
  // non "demo mode". Niente dati finti da mostrare a un utente reale — solo
  // dataset vuoto + loadFailed, così chi chiama sa di mostrare un avviso di
  // errore invece del banner "dati di esempio".
  const emptyOnError: NetworkData = {
    members: [],
    sales: [],
    entries: [],
    ranks: {},
    usingMockData: false,
    loadFailed: true,
  };

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.error("[load-network-data] nessun access_token in sessione");
    return emptyOnError;
  }

  // Un secondo tentativo copre gli intoppi di un istante (rinnovo del token
  // in corso, singola query andata a vuoto): meglio mezzo secondo in piu'
  // che un errore rosso in faccia a un utente per un problema gia' passato.
  for (let tentativo = 1; tentativo <= 2; tentativo++) {
    try {
      const cached = await getCachedNetwork(session.access_token);
      if (cached) return { ...cached, usingMockData: false, loadFailed: false };
    } catch (e) {
      console.error(
        `[load-network-data] tentativo ${tentativo}/2 fallito:`,
        e instanceof Error ? e.message : e,
      );
    }
    if (tentativo === 1) await new Promise((r) => setTimeout(r, 400));
  }

  return emptyOnError;
}
