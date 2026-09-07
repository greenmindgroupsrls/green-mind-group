"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/marketing", label: "Link & Materiali" },
  { href: "/marketing/agenda", label: "Agenda" },
  { href: "/marketing/eventi", label: "Eventi" },
  { href: "/marketing/documenti", label: "Documenti" },
];

// Voci riservate alla gestione aziendale: si distinguono in arancione,
// stessa convenzione delle voci root del menu laterale.
const ROOT_ITEMS = [{ href: "/marketing/lead", label: "Lead", gestione: true }];

export function MarketingNav({ isRoot }: { isRoot: boolean }) {
  const pathname = usePathname();
  const items: { href: string; label: string; gestione?: boolean }[] = isRoot
    ? [...ITEMS, ...ROOT_ITEMS]
    : ITEMS;

  return (
    // Barra su vetro, voci a pillola. Il verde fluo non puo' fare ne'
    // testo ne' bordo su fondo chiaro (1,3:1): si usa come riempimento, con
    // sopra un testo scuro, che invece si legge benissimo. Stessa regola per
    // l'arancione delle voci di gestione: acceso solo da riempimento.
    <nav className="glass-card inline-flex gap-1 overflow-x-auto p-1.5 self-start max-w-full">
      {items.map(({ href, label, gestione }) => {
        // "Agenda" resta evidenziata anche su /marketing/agenda/contatti,
        // che e' una sua sotto-pagina (vedi AgendaSubNav), non una voce a
        // se stante. Le altre voci non hanno sotto-pagine, quindi per loro
        // basta il confronto esatto.
        const active =
          pathname === href || (href === "/marketing/agenda" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0",
              active
                ? gestione
                  ? "bg-orange-500 text-orange-950 shadow-[0_4px_14px_-4px_rgba(249,115,22,0.55)]"
                  : "bg-[var(--accent)] text-[var(--accent-fg)] shadow-[0_4px_14px_-4px_var(--glow-primary)]"
                : gestione
                  ? "text-orange-800 dark:text-orange-400 hover:bg-orange-500/10 hover:text-orange-900 dark:hover:text-orange-300"
                  : "text-gray-600 dark:text-gray-300 hover:bg-[var(--glass-bg)] hover:text-gray-900 dark:hover:text-white",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
