"use client";

import { usePathname } from "next/navigation";
import { TabBar, TabLink } from "@/components/tab-bar";

const ITEMS = [
  { href: "/marketing", label: "Link & Materiali" },
  { href: "/marketing/agenda", label: "Agenda" },
  { href: "/marketing/eventi", label: "Eventi" },
  { href: "/marketing/documenti", label: "Documenti" },
];

// Voce riservata alla gestione aziendale: arancione, stessa convenzione
// delle voci root del menu laterale.
const ROOT_ITEMS = [{ href: "/marketing/lead", label: "Lead", gestione: true }];

export function MarketingNav({ isRoot }: { isRoot: boolean }) {
  const pathname = usePathname();
  const items: { href: string; label: string; gestione?: boolean }[] = isRoot
    ? [...ITEMS, ...ROOT_ITEMS]
    : ITEMS;

  return (
    <TabBar>
      {items.map(({ href, label, gestione }) => {
        // "Agenda" resta evidenziata anche su /marketing/agenda/contatti,
        // che e' una sua sotto-pagina (vedi AgendaSubNav), non una voce a
        // se stante. Le altre voci non hanno sotto-pagine, quindi per loro
        // basta il confronto esatto.
        const attiva =
          pathname === href || (href === "/marketing/agenda" && pathname.startsWith(`${href}/`));
        return (
          <TabLink
            key={href}
            href={href}
            attiva={attiva}
            variante={gestione ? "gestione" : "accento"}
          >
            {label}
          </TabLink>
        );
      })}
    </TabBar>
  );
}
