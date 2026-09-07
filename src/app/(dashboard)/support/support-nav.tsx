"use client";

import { usePathname } from "next/navigation";
import { TabBar, TabLink } from "@/components/tab-bar";

const ITEMS = [
  { href: "/support", label: "Academy" },
  { href: "/support/ticket", label: "Ticket" },
];

export function SupportNav() {
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
