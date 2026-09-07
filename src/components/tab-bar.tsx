"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// L'UNICA barra a schede del back office. Prima ce n'erano quattro versioni
// diverse (sottolineato, pillola, pillola su vetro, elenco verticale) nate in
// momenti diversi: cambiare l'aspetto voleva dire ricordarsi di sei file, e
// puntualmente qualcuno restava indietro. Da qui in poi si tocca solo questo.
//
// Il verde fluo non puo' fare ne' testo ne' bordo su fondo chiaro (1,3:1):
// vive come riempimento con sopra un inchiostro scuro. Stessa regola per
// l'arancione delle voci di gestione aziendale.

export type VarianteScheda = "accento" | "gestione";

const BASE =
  "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0";

const STILE: Record<VarianteScheda, { attiva: string; spenta: string }> = {
  accento: {
    attiva:
      "bg-[var(--accent)] text-[var(--accent-fg)] shadow-[0_4px_14px_-4px_var(--glow-primary)]",
    spenta:
      "text-gray-600 dark:text-gray-300 hover:bg-[var(--glass-bg)] hover:text-gray-900 dark:hover:text-white",
  },
  gestione: {
    attiva:
      "bg-orange-500 text-orange-950 shadow-[0_4px_14px_-4px_rgba(249,115,22,0.55)]",
    spenta:
      "text-orange-800 dark:text-orange-400 hover:bg-orange-500/10 hover:text-orange-900 dark:hover:text-orange-300",
  },
};

function classiScheda(attiva: boolean, variante: VarianteScheda): string {
  const s = STILE[variante];
  return `${BASE} ${attiva ? s.attiva : s.spenta}`;
}

export function TabBar({ children }: { children: ReactNode }) {
  return (
    <nav className="glass-card inline-flex gap-1 overflow-x-auto p-1.5 self-start max-w-full">
      {children}
    </nav>
  );
}

export function TabLink({
  href,
  attiva,
  variante = "accento",
  children,
}: {
  href: string;
  attiva: boolean;
  variante?: VarianteScheda;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={classiScheda(attiva, variante)}>
      {children}
    </Link>
  );
}

export function TabButton({
  attiva,
  variante = "accento",
  onClick,
  children,
}: {
  attiva: boolean;
  variante?: VarianteScheda;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={classiScheda(attiva, variante)}>
      {children}
    </button>
  );
}
