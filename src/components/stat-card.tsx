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
    <div className="glass-card glass-card-interactive p-3.5 sm:p-5">
      {/* Su telefono icona ed etichetta stanno affiancate, su schermo grande
          incolonnate: la scheda passa da 170 a 90px di altezza, e cinque
          schede smettono di essere mezzo metro di scorrimento prima di
          vedere qualunque altra cosa. */}
      <div className="flex items-center gap-2 sm:block">
        <div
          className={`h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-lg sm:rounded-xl flex items-center justify-center ring-1 ring-inset ring-white/10 ${TONE_CLASS[tone]}`}
        >
          <Icon size={18} />
        </div>
        {/* L'etichetta e' piccola e in maiuscoletto, il numero grande: la
            gerarchia dice a colpo d'occhio cosa contare e cosa leggere. */}
        <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider leading-tight text-gray-500 dark:text-gray-400 sm:mt-4">
          {label}
        </p>
      </div>
      <p className="text-xl sm:text-[1.75rem] leading-tight font-semibold tracking-tight text-gray-900 dark:text-white mt-2 sm:mt-1">
        {value}
      </p>
      {delta && (
        <p
          className={`text-[11px] sm:text-xs mt-1 ${
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
