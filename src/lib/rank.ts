import type { Member } from "./members";

export type Rank = "standard" | "vip" | "royal";

const ROYAL_VIP_DIRECTS_THRESHOLD = 10;

// Mirror di member_ranks (vedi supabase/migrations/0002_ranks_and_commissions.sql).
export function computeRanks(members: Member[]): Map<number, Rank> {
  const isVip = new Map<number, boolean>();
  for (const member of members) {
    isVip.set(member.activity_code, member.pass_up_done);
  }

  const vipDirectCounts = new Map<number, number>();
  for (const member of members) {
    if (member.parent_code === null) continue;
    if (!isVip.get(member.activity_code)) continue;
    vipDirectCounts.set(
      member.parent_code,
      (vipDirectCounts.get(member.parent_code) ?? 0) + 1,
    );
  }

  const ranks = new Map<number, Rank>();
  for (const member of members) {
    const vipDirects = vipDirectCounts.get(member.activity_code) ?? 0;
    if (vipDirects >= ROYAL_VIP_DIRECTS_THRESHOLD) {
      ranks.set(member.activity_code, "royal");
    } else if (isVip.get(member.activity_code)) {
      ranks.set(member.activity_code, "vip");
    } else {
      ranks.set(member.activity_code, "standard");
    }
  }
  return ranks;
}

export const RANK_LABEL: Record<Rank, string> = {
  standard: "Standard",
  vip: "VIP",
  royal: "Royal",
};
