"use client";

import { usePathname } from "next/navigation";
import { TabBar, TabLink } from "@/components/tab-bar";
import { useTesti } from "@/i18n/testi-client";

export function MarketingNav({ isRoot }: { isRoot: boolean }) {
  const pathname = usePathname();
  const T = useTesti().marketing;

  // Le etichette dipendono dalla lingua: l'elenco vive dentro il componente.
  // "Lead" e' riservata alla gestione aziendale e si distingue in arancione,
  // stessa convenzione delle voci root del menu laterale.
  const items: { href: string; label: string; gestione?: boolean }[] = [
    { href: "/marketing", label: T.linkMateriali },
    { href: "/marketing/agenda", label: T.agenda },
    { href: "/marketing/eventi", label: T.eventi },
    { href: "/marketing/documenti", label: T.documenti },
    ...(isRoot ? [{ href: "/marketing/lead", label: T.lead, gestione: true }] : []),
  ];

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
