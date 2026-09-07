"use client";

import { usePathname } from "next/navigation";
import { TabBar, TabLink } from "@/components/tab-bar";

const ITEMS = [
  { href: "/payout", label: "Panoramica" },
  { href: "/payout/commissioni", label: "Commissioni" },
  { href: "/payout/prelevare", label: "Prelevare" },
];

export function PayoutNav() {
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
