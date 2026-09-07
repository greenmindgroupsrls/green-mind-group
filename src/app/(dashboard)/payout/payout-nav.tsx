"use client";

import { usePathname } from "next/navigation";
import { TabBar, TabLink } from "@/components/tab-bar";
import { useTesti } from "@/i18n/testi-client";

export function PayoutNav() {
  const pathname = usePathname();
  const T = useTesti().payout;

  // Le etichette dipendono dalla lingua, quindi l'elenco vive dentro il
  // componente: fuori, T non esiste ancora.
  const items = [
    { href: "/payout", label: T.panoramica },
    { href: "/payout/commissioni", label: T.commissioni },
    { href: "/payout/prelevare", label: T.prelevare },
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
