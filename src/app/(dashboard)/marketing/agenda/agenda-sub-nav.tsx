"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/marketing/agenda", label: "Attività" },
  { href: "/marketing/agenda/contatti", label: "Contatti" },
];

// Stile "pillola", visivamente più leggero della barra principale
// (MarketingNav): segnala che queste due voci sono due viste della stessa
// sezione (Agenda), non pagine indipendenti alla pari.
export function AgendaSubNav() {
  const pathname = usePathname();

  return (
    <div className="inline-flex rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-1 self-start">
      {ITEMS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-accent text-[var(--accent-fg)] shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
