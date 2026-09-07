"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, MapPin, Info, FileText, KeyRound, CreditCard } from "lucide-react";

const ITEMS = [
  { href: "/impostazioni", label: "My Profile", icon: User },
  { href: "/impostazioni/indirizzi", label: "Saved Addresses", icon: MapPin },
  { href: "/impostazioni/about", label: "About Me", icon: Info },
  { href: "/impostazioni/documenti", label: "KYC Documents", icon: FileText },
  { href: "/impostazioni/password", label: "Change Password", icon: KeyRound },
  { href: "/impostazioni/carte", label: "Saved Cards", icon: CreditCard },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            // Elenco verticale, non barra a schede: segue il menu laterale
            // (glass-nav-active), che ha la stessa forma.
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
              active
                ? "glass-nav-active font-medium text-gray-900 dark:text-white"
                : "text-gray-600 dark:text-gray-300 hover:bg-[var(--glass-bg)] hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Icon size={17} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
