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
    <div className="glass-card inline-flex rounded-lg p-1 self-start">
      {ITEMS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
