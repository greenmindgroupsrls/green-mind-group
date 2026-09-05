"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/marketing", label: "Link & Materiali" },
  { href: "/marketing/agenda", label: "Agenda" },
  { href: "/marketing/eventi", label: "Eventi" },
  { href: "/marketing/documenti", label: "Documenti" },
];

const ROOT_ITEMS = [{ href: "/marketing/lead", label: "Lead" }];

export function MarketingNav({ isRoot }: { isRoot: boolean }) {
  const pathname = usePathname();
  const items = isRoot ? [...ITEMS, ...ROOT_ITEMS] : ITEMS;

  return (
    // Barra su vetro, voci a pillola. Il verde fluo non puo' fare ne'
    // testo ne' bordo su fondo chiaro (1,3:1): si usa come riempimento, con
    // sopra un testo scuro, che invece si legge benissimo.
    <nav className="glass-card inline-flex gap-1 overflow-x-auto p-1.5 self-start max-w-full">
      {items.map(({ href, label }) => {
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
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${
              active
                ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-[0_4px_14px_-4px_var(--glow-primary)]"
                : "text-gray-600 dark:text-gray-300 hover:bg-[var(--glass-bg)] hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
