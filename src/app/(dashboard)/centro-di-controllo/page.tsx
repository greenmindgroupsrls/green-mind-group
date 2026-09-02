import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import type { Member } from "@/lib/members";
import type { Sale, CommissionEntry } from "@/lib/commissions";
import type { Rank } from "@/lib/rank";
import type { ControlCenterMember } from "./control-center-explorer";
import { ControlCenterTabs } from "./control-center-tabs";
import type { AuditLogRow } from "./audit-log-view";
import type { CompensationSettings } from "./compensation-settings-view";
import type { RoyalPoolInfo } from "./royal-pool-view";

export const dynamic = "force-dynamic";

type ProfileRow = {
  activity_code: number;
  account_type: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
  tax_id: string | null;
  company_name: string | null;
};

function subtreeSize(members: Member[], code: number): number {
  let count = 0;
  const stack = members.filter((m) => m.parent_code === code);
  while (stack.length > 0) {
    const node = stack.pop()!;
    count++;
    stack.push(...members.filter((m) => m.parent_code === node.activity_code));
  }
  return count;
}

export default async function ControlCenterPage() {
  if (!supabaseConfigured()) {
    return (
      <div className="p-8">
        <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
          Supabase non ancora collegato: il centro di controllo non è disponibile in modalità demo.
        </p>
      </div>
    );
  }

  const member = await getCurrentMember();
  if (!member || member.activity_code !== 0) {
    redirect("/");
  }

  const supabase = await createClient();
  const [
    { data: memberRows },
    { data: profileRows },
    { data: rankRows },
    { data: overrideRows },
    { data: salesRows },
    { data: entryRows },
    { data: auditRows },
    { data: compensationRow },
    { data: poolRows },
    { data: ultimaChiusuraRow },
  ] = await Promise.all([
    supabase.from("members").select("*").order("activity_code", { ascending: true }),
    supabase
      .from("member_profiles")
      .select("activity_code, account_type, phone_country_code, phone_number, tax_id, company_name"),
    supabase.from("member_ranks").select("activity_code, rank"),
    supabase.from("member_rank_overrides").select("activity_code, rank"),
    supabase.from("sales").select("*"),
    supabase.from("commission_entries").select("*"),
    supabase
      .from("admin_audit_log")
      .select("id, action_type, target_code, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("compensation_settings")
      .select(
        "plan2_active_from, plan2_direct_rate, plan2_passup_rate, plan2_pool_rate, plan2_passup_quota, plan2_royal_directs",
      )
      .eq("id", 1)
      .single(),
    supabase.from("royal_pool_entries").select("amount, settlement_id"),
    supabase
      .from("royal_pool_settlements")
      .select("settled_at, total_amount, royal_count, share")
      .order("settled_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const members = (memberRows ?? []) as Member[];
  const profiles = (profileRows ?? []) as ProfileRow[];
  const sales = (salesRows ?? []) as Sale[];
  const entries = (entryRows ?? []) as CommissionEntry[];

  const ranks: Record<number, Rank> = {};
  for (const row of rankRows ?? []) ranks[row.activity_code] = row.rank as Rank;

  const overrides: Record<number, Rank> = {};
  for (const row of overrideRows ?? []) overrides[row.activity_code] = row.rank as Rank;

  const profileByCode = new Map(profiles.map((p) => [p.activity_code, p]));
  const byCode = new Map(members.map((m) => [m.activity_code, m]));

  const earningsByCode = new Map<number, number>();
  for (const e of entries) {
    earningsByCode.set(e.beneficiary_code, (earningsByCode.get(e.beneficiary_code) ?? 0) + e.amount);
  }
  const piecesByCode = new Map<number, number>();
  for (const s of sales) {
    piecesByCode.set(s.seller_code, (piecesByCode.get(s.seller_code) ?? 0) + s.quantity);
  }

  const controlCenterMembers: ControlCenterMember[] = members.map((m) => {
    const sponsor = m.ref_sponsor_code !== null ? byCode.get(m.ref_sponsor_code) : undefined;
    const profile = profileByCode.get(m.activity_code);
    return {
      activity_code: m.activity_code,
      username: m.username,
      first_name: m.first_name,
      last_name: m.last_name,
      role: m.role,
      created_at: m.created_at,
      sponsorCode: sponsor?.activity_code ?? null,
      sponsorName: sponsor?.username ?? null,
      rank: ranks[m.activity_code] ?? "standard",
      rankOverride: overrides[m.activity_code] ?? null,
      teamSize: subtreeSize(members, m.activity_code),
      totalEarnings: earningsByCode.get(m.activity_code) ?? 0,
      piecesSold: piecesByCode.get(m.activity_code) ?? 0,
      accountType: profile?.account_type ?? "individual",
      phoneCountryCode: profile?.phone_country_code ?? null,
      phoneNumber: profile?.phone_number ?? null,
      taxId: profile?.tax_id ?? null,
      companyName: profile?.company_name ?? null,
      suspended: m.suspended,
      suspendedReason: m.suspended_reason ?? null,
    };
  });

  const auditLog: AuditLogRow[] = (auditRows ?? []).map((r) => ({
    id: r.id,
    actionType: r.action_type,
    targetCode: r.target_code,
    targetName: r.target_code !== null ? (byCode.get(r.target_code)?.username ?? null) : null,
    details: r.details as Record<string, unknown> | null,
    createdAt: r.created_at,
  }));

  const compensationSettings: CompensationSettings = {
    attivoDa: compensationRow?.plan2_active_from
      ? new Date(compensationRow.plan2_active_from).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : null,
    direttaRate: compensationRow?.plan2_direct_rate ?? 170,
    passUpRate: compensationRow?.plan2_passup_rate ?? 80,
    poolRate: compensationRow?.plan2_pool_rate ?? 31.72,
    passUpQuota: compensationRow?.plan2_passup_quota ?? 2,
    royalDiretti: compensationRow?.plan2_royal_directs ?? 10,
  };

  // Stato del Royal Pool: quanto c'e' da distribuire e a quanti.
  const poolDaLiquidare = (poolRows ?? []).filter((r) => r.settlement_id === null);
  const royalPool: RoyalPoolInfo = {
    accantonato: poolDaLiquidare.reduce((somma, r) => somma + Number(r.amount), 0),
    vendite: poolDaLiquidare.length,
    royalQualificati: members.filter(
      (m) => m.activity_code !== 0 && ranks[m.activity_code] === "royal",
    ).length,
    ultimaChiusura: ultimaChiusuraRow
      ? {
          data: new Date(ultimaChiusuraRow.settled_at).toLocaleDateString("it-IT"),
          totale: Number(ultimaChiusuraRow.total_amount),
          quantiRoyal: ultimaChiusuraRow.royal_count,
          quota: Number(ultimaChiusuraRow.share),
        }
      : null,
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Centro di controllo</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1">
        Vista e gestione completa di tutti i membri della rete — visibile solo all&apos;account aziendale.
      </p>
      <div className="mt-6">
        <ControlCenterTabs
          members={controlCenterMembers}
          auditLog={auditLog}
          compensationSettings={compensationSettings}
          royalPool={royalPool}
        />
      </div>
    </div>
  );
}
