import type { LucideIcon } from "lucide-react";

const TONE_CLASS = {
  accent: "bg-accent/10 text-accent",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  tone = "accent",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: { value: string; positive: boolean } | null;
  tone?: keyof typeof TONE_CLASS;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-5 shadow-sm">
      <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${TONE_CLASS[tone]}`}>
        <Icon size={22} />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-0.5">{value}</p>
      {delta && (
        <p
          className={`text-xs mt-1 ${
            delta.positive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {delta.value} <span className="text-gray-400 dark:text-gray-500">questo mese</span>
        </p>
      )}
    </div>
  );
}
