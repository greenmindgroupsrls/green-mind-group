import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import type { Member } from "@/lib/members";
import { computeRanks, type Rank } from "@/lib/rank";
import { MOCK_MEMBERS } from "@/lib/mock-members";
import { IncaricatoOnlyNotice } from "@/components/incaricato-only-notice";
import { NetworkExplorer } from "./network-explorer";

export const dynamic = "force-dynamic";

async function loadMembers(): Promise<{
  members: Member[];
  ranks: Record<number, Rank>;
  avatars: Record<number, string>;
  usingMockData: boolean;
  loadFailed: boolean;
}> {
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseConfigured) {
    return {
      members: MOCK_MEMBERS,
      ranks: Object.fromEntries(computeRanks(MOCK_MEMBERS)),
      avatars: {},
      usingMockData: true,
      loadFailed: false,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("activity_code", { ascending: true });

  if (error || !data || data.length === 0) {
    if (error) console.error("[albero] members:", error.message);
    else console.error("[albero] members: nessuna riga restituita per questo utente");
    // Supabase è configurato ma il caricamento è fallito per davvero: niente
    // albero finto da mostrare a un utente vero, solo un avviso d'errore.
    return {
      members: [],
      ranks: {},
      avatars: {},
      usingMockData: false,
      loadFailed: true,
    };
  }

  // I rank vengono dalla vista member_ranks (motore reale nel DB) invece
  // che ricalcolati lato client, cosi' un eventuale rank forzato a mano dal
  // Centro di controllo si vede correttamente anche qui — vedi commento in
  // src/lib/load-network-data.ts.
  const [{ data: avatarRows }, { data: rankRows }] = await Promise.all([
    supabase.from("member_avatars").select("activity_code, avatar_url").not("avatar_url", "is", null),
    supabase.from("member_ranks").select("activity_code, rank"),
  ]);

  const avatars = Object.fromEntries(
    (avatarRows ?? [])
      .filter((a) => a.avatar_url)
      .map((a) => [a.activity_code, a.avatar_url as string]),
  );

  const ranks: Record<number, Rank> = {};
  for (const row of rankRows ?? []) {
    ranks[row.activity_code] = row.rank as Rank;
  }

  return { members: data as Member[], ranks, avatars, usingMockData: false, loadFailed: false };
}

export default async function AlberoPage() {
  const [{ members, ranks, avatars, usingMockData, loadFailed }, currentMember] = await Promise.all([
    loadMembers(),
    getCurrentMember(),
  ]);

  const rootCode = usingMockData ? 0 : (currentMember?.activity_code ?? 0);

  if (!usingMockData && currentMember?.role === "cliente") {
    return (
      <div className="p-8">
        <IncaricatoOnlyNotice />
      </div>
    );
  }

  return (
    <div>
      {usingMockData && (
        <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-8 py-2 border-b border-amber-200 dark:border-amber-500/20">
          Supabase non ancora collegato: questi sono dati di esempio a scopo dimostrativo.
        </div>
      )}
      {loadFailed && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-sm px-8 py-2 border-b border-red-200 dark:border-red-500/20">
          Non è stato possibile caricare i tuoi dati in questo momento. Ricarica la pagina o riprova tra poco.
        </div>
      )}
      <NetworkExplorer members={members} ranks={ranks} rootCode={rootCode} avatars={avatars} />
    </div>
  );
}
