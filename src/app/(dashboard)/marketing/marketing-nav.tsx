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
    <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-white/10">
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
                ? "border-accent text-accent"
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
