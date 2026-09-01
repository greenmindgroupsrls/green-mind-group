"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/payout", label: "Panoramica" },
  { href: "/payout/commissioni", label: "Commissioni" },
  { href: "/payout/prelevare", label: "Prelevare" },
];

export function PayoutNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-gray-200 dark:border-white/10">
      {ITEMS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-accent text-accent"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
