import { RANK_LABEL, type Rank } from "@/lib/rank";

const BAR_CLASS: Record<Rank, string> = {
  standard: "bg-gray-300 dark:bg-white/20",
  vip: "bg-accent",
  royal: "bg-amber-400 dark:bg-amber-500",
};

const ORDER: Rank[] = ["standard", "vip", "royal"];

export function RankDistribution({ counts }: { counts: Record<Rank, number> }) {
  const max = Math.max(counts.standard, counts.vip, counts.royal, 1);

  return (
    <div className="flex flex-col gap-4">
      {ORDER.map((rank) => (
        <div key={rank} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0">
            {RANK_LABEL[rank]}
          </span>
          <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full ${BAR_CLASS[rank]}`}
              style={{ width: `${(counts[rank] / max) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white w-6 text-right shrink-0">
            {counts[rank]}
          </span>
        </div>
      ))}
    </div>
  );
}
