import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import type { Member } from "@/lib/members";
import type { Sale, CommissionEntry } from "@/lib/commissions";
import type { Rank } from "@/lib/rank";
import { loadNetworkData } from "@/lib/load-network-data";
import { DashboardView } from "./dashboard-view";
import { AnnouncementsFeed } from "./announcements-feed";
import { ClientDashboard } from "./client-dashboard";
import { ContractReminder } from "./contract-reminder";
import { NextActions } from "./next-actions";

export const dynamic = "force-dynamic";

// La demo mostra solo l'account aziendale (vedi src/lib/mock-members.ts):
// niente rete finta di paesi esteri, solo l'Italia del quartier generale.
const MOCK_COUNTRIES: Record<number, string> = {
  0: "Italia",
};

async function loadDashboardData(): Promise<{
  members: Member[];
  sales: Sale[];
  entries: CommissionEntry[];
  ranks: Record<number, Rank>;
  countries: Record<number, string>;
  totalRevenue: number;
  usingMockData: boolean;
  loadFailed: boolean;
}> {
  const network = await loadNetworkData();

  if (network.usingMockData) {
    return { ...network, countries: MOCK_COUNTRIES, totalRevenue: 0 };
  }
  if (network.loadFailed) {
    return { ...network, countries: {}, totalRevenue: 0 };
  }

  const supabase = await createClient();
  const [{ data: countryRows }, { data: revenue }] = await Promise.all([
    supabase.from("member_countries").select("activity_code, country").not("country", "is", null),
    // network_revenue() è una funzione SECURITY DEFINER che restituisce solo
    // la somma aggregata per il sotto-albero del chiamante (via
    // is_self_or_descendant), senza esporre le righe di shop_orders — che
    // contengono indirizzo/telefono di spedizione reali. Così ogni account
    // vede il fatturato vero della propria rete, non solo dei propri
    // acquisti, senza allargare la RLS sugli ordini individuali.
    supabase.rpc("network_revenue"),
  ]);

  const countries = Object.fromEntries(
    (countryRows ?? [])
      .filter((c) => c.country)
      .map((c) => [c.activity_code, c.country as string]),
  );

  const totalRevenue = Number(revenue ?? 0);

  return { ...network, countries, totalRevenue };
}

export default async function Home() {
  const [
    { members, sales, entries, ranks, countries, totalRevenue, usingMockData, loadFailed },
    currentMember,
  ] = await Promise.all([loadDashboardData(), getCurrentMember()]);

  const rootCode = usingMockData ? 0 : (currentMember?.activity_code ?? 0);
  const isRoot = rootCode === 0;

  if (!usingMockData && currentMember?.role === "cliente") {
    return <ClientDashboard username={currentMember.username} />;
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
      {!usingMockData && !loadFailed && currentMember && currentMember.activity_code !== 0 && (
        <ContractReminder activityCode={currentMember.activity_code} />
      )}
      <DashboardView
        members={members}
        sales={sales}
        entries={entries}
        ranks={ranks}
        countries={countries}
        totalRevenue={totalRevenue}
        rootCode={rootCode}
        isRoot={isRoot}
        announcementsSlot={
          <AnnouncementsFeed isRoot={isRoot} usingMockData={usingMockData || loadFailed} />
        }
        azioniSlot={
          !usingMockData && !loadFailed && currentMember ? (
            <NextActions activityCode={currentMember.activity_code} />
          ) : null
        }
      />
    </div>
  );
}
