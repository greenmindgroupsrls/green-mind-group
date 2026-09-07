"use client";

import { usePathname } from "next/navigation";
import { TabBar, TabLink } from "@/components/tab-bar";

const ITEMS = [
  { href: "/marketing/agenda", label: "Attività" },
  { href: "/marketing/agenda/contatti", label: "Contatti" },
];

export function AgendaSubNav() {
  const pathname = usePathname();

  return (
    <TabBar>
      {ITEMS.map(({ href, label }) => (
        <TabLink key={href} href={href} attiva={pathname === href}>
          {label}
        </TabLink>
      ))}
    </TabBar>
  );
}
