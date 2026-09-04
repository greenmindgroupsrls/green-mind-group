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
    <div className="glass-card glass-card-interactive p-5">
      <div
        className={`h-10 w-10 rounded-xl flex items-center justify-center ring-1 ring-inset ring-white/10 ${TONE_CLASS[tone]}`}
      >
        <Icon size={20} />
      </div>
      {/* L'etichetta e' piccola e in maiuscoletto, il numero grande: la
          gerarchia dice a colpo d'occhio cosa contare e cosa leggere. */}
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-4">
        {label}
      </p>
      <p className="text-[1.75rem] leading-tight font-semibold tracking-tight text-gray-900 dark:text-white mt-1">
        {value}
      </p>
      {delta && (
        <p
          className={`text-xs mt-1 ${
            delta.positive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {delta.value} <span className="text-gray-500 dark:text-gray-400">questo mese</span>
        </p>
      )}
    </div>
  );
}
