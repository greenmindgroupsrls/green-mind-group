"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, MapPin, Info, FileText, KeyRound, CreditCard } from "lucide-react";
import { useTesti } from "@/i18n/testi-client";


export function SettingsNav() {
  const T = useTesti().impostazioni;
  // Le etichette dipendono dalla lingua: l'elenco vive dentro il componente.
  const ITEMS = [
    { href: "/impostazioni", label: T.profilo, icon: User },
    { href: "/impostazioni/indirizzi", label: T.indirizzi, icon: MapPin },
    { href: "/impostazioni/about", label: T.suDiMe, icon: Info },
    { href: "/impostazioni/documenti", label: T.documentiKyc, icon: FileText },
    { href: "/impostazioni/password", label: T.cambiaPassword, icon: KeyRound },
    { href: "/impostazioni/carte", label: T.carteSalvate, icon: CreditCard },
  ];
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
