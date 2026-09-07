"use client";

import { usePathname } from "next/navigation";
import { TabBar, TabLink } from "@/components/tab-bar";
import { useTesti } from "@/i18n/testi-client";

export function SupportNav() {
  const pathname = usePathname();
  const T = useTesti().supporto;

  // Le etichette dipendono dalla lingua: l'elenco vive dentro il componente.
  const items = [
    { href: "/support", label: T.academy },
    { href: "/support/ticket", label: T.ticket },
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
