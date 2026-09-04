import type { CommissionKind } from "./commissions";

// Come si chiama, in chiaro, ogni riga di provvigione.
//
// Il Sistema 2 marca ogni riga con il proprio tipo. Le righe registrate con
// il piano precedente non ce l'hanno e si leggono dal livello: 0 era la
// vendita propria, 1-3 le commissioni dai livelli superiori. Le due forme
// convivono perche' lo storico non si riscrive.
export function etichettaProvvigione(kind: CommissionKind | null, level: number): string {
  switch (kind) {
    case "diretta":
      return "Vendita diretta";
    case "pass_up":
      return "Pass-up VIP";
    case "upline":
      return "Indennizzo linea ceduta";
    case "pool_royal":
      return "Quota Royal Pool";
    default:
      return level === 0 ? "Vendita diretta" : `Commissione Livello ${level}`;
  }
}

const NEUTRO = "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300";

export function coloreProvvigione(kind: CommissionKind | null, level: number): string {
  switch (kind) {
    case "diretta":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
    case "pass_up":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400";
    case "upline":
      return "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400";
    case "pool_royal":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
    default:
      return (
        {
          0: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
          1: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
          2: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
          3: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
        }[level] ?? NEUTRO
      );
  }
}
