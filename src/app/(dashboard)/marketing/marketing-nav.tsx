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
    // La barra sta su vetro e non direttamente sullo sfondo colorato: il
    // verde del testo li' sopra sembrava grigio, e per essere leggibile su
    // quel fondo avrebbe dovuto essere ancora piu' scuro.
    <nav className="glass-card rounded-xl rounded-b-none border-b-0 flex gap-1 overflow-x-auto px-1 pt-1">
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
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0 ${
              active
                ? // Il sottolineato e' un elemento grafico, non testo:
                  // puo' portare il verde vivo del marchio. L'etichetta usa
                  // il verde piu' scuro, che sulla scheda chiara si legge.
                  "border-[var(--accent)] text-accent"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
