"use client";

import { usePathname } from "next/navigation";
import { TabBar, TabLink } from "@/components/tab-bar";
import { useTesti } from "@/i18n/testi-client";

export function AgendaSubNav() {
  const pathname = usePathname();
  const T = useTesti().marketing;

  // Le etichette dipendono dalla lingua: l'elenco vive dentro il componente.
  const items = [
    { href: "/marketing/agenda", label: T.attivita },
    { href: "/marketing/agenda/contatti", label: T.contatti },
  ];

  return (
    <TabBar>
      {items.map(({ href, label }) => (
        <TabLink key={href} href={href} attiva={pathname === href}>
          {label}
        </TabLink>
      ))}
    </TabBar>
  );
}
