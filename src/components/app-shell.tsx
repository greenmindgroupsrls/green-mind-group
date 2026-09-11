"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  PackageCheck,
  LayoutDashboard,
  ClipboardPlus,
  Network,
  Megaphone,
  Wallet,
  ShoppingBag,
  MessageSquare,
  LifeBuoy,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  CalendarClock,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { signOut } from "@/lib/auth-actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Dizionario } from "@/i18n/dizionario";
import type { Lingua } from "@/i18n/config";
import { MemberAvatar } from "./member-avatar";
import { formatActivityCode } from "@/lib/activity-code";
import { createClient } from "@/lib/supabase/client";
import type { RecentNotification } from "@/lib/notifications";
import { MarchioSimbolo } from "./marchio";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "adesso";
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h fa`;
  const days = Math.round(hours / 24);
  return `${days} g fa`;
}

const MAIN_NAV_ITEMS = [
  { href: "/dashboard", chiave: "dashboard" as const, icon: LayoutDashboard, incaricatoOnly: false, rootOnly: false, highlighted: false },
  { href: "/registrazione", chiave: "registrazione" as const, icon: ClipboardPlus, incaricatoOnly: true, rootOnly: false, highlighted: false },
  { href: "/albero", chiave: "team" as const, icon: Network, incaricatoOnly: true, rootOnly: false, highlighted: false },
  { href: "/marketing", chiave: "marketing" as const, icon: Megaphone, incaricatoOnly: true, rootOnly: false, highlighted: false },
  { href: "/payout", chiave: "payout" as const, icon: Wallet, incaricatoOnly: true, rootOnly: false, highlighted: false },
  { href: "/shop", chiave: "shop" as const, icon: ShoppingBag, incaricatoOnly: false, rootOnly: false, highlighted: false },
  { href: "/eventi", chiave: "eventi" as const, icon: CalendarClock, incaricatoOnly: false, rootOnly: true, highlighted: true },
  {
    href: "/centro-di-controllo",
    chiave: "centroDiControllo" as const,
    icon: ShieldCheck,
    incaricatoOnly: false,
    rootOnly: true,
    highlighted: true,
  },
  // Porta alla stessa pagina che l'azienda vede gia' dal negozio, con chi ha
  // ordinato e dove spedire: qui pero' si trova senza passare dal catalogo,
  // ed e' l'unica voce del menu che sa avvisare da sola.
  {
    href: "/shop/ordini",
    chiave: "ordini" as const,
    icon: PackageCheck,
    incaricatoOnly: false,
    rootOnly: true,
    highlighted: true,
  },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/messaggi", chiave: "messaggi" as const, icon: MessageSquare },
  { href: "/support", chiave: "support" as const, icon: LifeBuoy },
  { href: "/impostazioni", chiave: "impostazioni" as const, icon: Settings },
];


// Quale voce del menu illuminare. La dashboard risponde solo al percorso
// esatto, altrimenti resterebbe accesa ovunque; le altre restano accese
// anche nelle loro sottopagine.
//
// Vince la voce piu' precisa. Prima bastava che l'indirizzo aperto
// cominciasse con quello della voce, e da quando "Ordini" porta a
// /shop/ordini si accendevano due voci insieme: Shop (/shop) e Ordini. Ora
// una voce resta spenta se un'altra combacia con un indirizzo piu' lungo.
function voceAttiva(percorso: string, href: string, tutte: string[]): boolean {
  const combacia = (h: string) =>
    h === "/" ? percorso === "/" : percorso === h || percorso.startsWith(h + "/");
  if (!combacia(href)) return false;
  return !tutte.some((altra) => altra.length > href.length && combacia(altra));
}

export function AppShell({
  children,
  currentMember,
  unreadCount = 0,
  nuoviOrdini = 0,
  notifications = [],
  testi,
  lingua,
}: {
  children: React.ReactNode;
  currentMember: {
    username: string;
    activity_code: number;
    avatar_url: string | null;
    role: "cliente" | "incaricato";
  } | null;
  unreadCount?: number;
  nuoviOrdini?: number;
  notifications?: RecentNotification[];
  testi: Dizionario;
  lingua: Lingua;
}) {
  const router = useRouter();
  const percorso = usePathname();
  const tutteLeVoci = [...MAIN_NAV_ITEMS, ...BOTTOM_NAV_ITEMS].map((v) => v.href);
  const attiva = (href: string) => voceAttiva(percorso, href, tutteLeVoci);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  function toggleNotif() {
    const opening = !notifOpen;
    setNotifOpen(opening);
    // Aprendo il pannello si segnano tutti i messaggi come letti — stesso
    // comportamento già presente visitando /messaggi (mark_messages_read è
    // idempotente). router.refresh() aggiorna il numero sul badge e lo
    // stato "letto" per la prossima apertura.
    if (opening && unreadCount > 0) {
      const supabase = createClient();
      (async () => {
        try {
          await supabase.rpc("mark_messages_read");
        } catch {
          // best-effort
        }
        router.refresh();
      })();
    }
  }
  const isCliente = currentMember?.role === "cliente";
  const isRoot = currentMember?.activity_code === 0;
  const visibleMainNavItems = MAIN_NAV_ITEMS.filter(
    (item) => (!isCliente || !item.incaricatoOnly) && (!item.rootOnly || isRoot),
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 shrink-0 h-full overflow-y-auto glass-card glass-panel rounded-none border-y-0 border-l-0 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center justify-between gap-2 px-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            {/* 40px e non 32: sotto quella misura il tratto del simbolo si
                impasta e resta una macchia (provato alle misure vere). */}
            <MarchioSimbolo className="h-10 w-auto shrink-0" priority />
            <span className="font-semibold text-gray-900 dark:text-white truncate">
              Green Mind Group
            </span>
          </div>
          <button
            type="button"
            onClick={closeMobile}
            className="md:hidden shrink-0 h-8 w-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Chiudi menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {visibleMainNavItems.map(({ href, chiave, icon: Icon, highlighted }) => (
            <Link
              key={href}
              href={href}
              onClick={closeMobile}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                attiva(href)
                  ? "glass-nav-active font-medium text-gray-900 dark:text-white"
                  : highlighted
                    // Arancione = gestione aziendale. Sul tema chiaro serve un
                    // tono profondo: orange-600 sul vetro sta a 2,6:1. Sullo
                    // scuro orange-400 arriva a 5:1 e resta un arancione vivo.
                    ? "text-orange-800 dark:text-orange-400 hover:bg-orange-500/10 hover:text-orange-900 dark:hover:text-orange-300"
                    : "text-gray-600 dark:text-gray-300 hover:bg-[var(--glass-bg)] hover:text-gray-900 dark:hover:text-white",
              ].join(" ")}
            >
              <Icon size={18} />
              <span className="flex-1">{testi.nav[chiave]}</span>
              {/* Il pallino sta sulla parola, non sull'icona: si legge
                  insieme al nome della voce invece che di fianco. */}
              {chiave === "ordini" && nuoviOrdini > 0 && (
                <span
                  aria-label={`${nuoviOrdini} ${nuoviOrdini === 1 ? "nuovo ordine" : "nuovi ordini"}`}
                  // red-500 col bianco sopra sta a 3,8:1, sotto la soglia per un testo
                  // di 11px. Il 600 arriva a 4,8:1 ed e' lo stesso rosso a
                  // colpo d'occhio.
                  className="shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center tabular-nums"
                >
                  {nuoviOrdini > 9 ? "9+" : nuoviOrdini}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <nav className="px-3 py-4 flex flex-col gap-1 border-t border-gray-200 dark:border-white/10">
          {BOTTOM_NAV_ITEMS.map(({ href, chiave, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={closeMobile}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                attiva(href)
                  ? "glass-nav-active font-medium text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-300 hover:bg-[var(--glass-bg)] hover:text-gray-900 dark:hover:text-white",
              ].join(" ")}
            >
              <Icon size={18} />
              {testi.nav[chiave]}
            </Link>
          ))}
        </nav>
        {currentMember && (
          <div className="px-3 py-4 border-t border-gray-200 dark:border-white/10 flex items-center gap-3">
            <MemberAvatar
              code={currentMember.activity_code}
              username={currentMember.username}
              avatarUrl={currentMember.avatar_url}
              size={36}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {currentMember.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatActivityCode(currentMember.activity_code)}
              </p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                aria-label={testi.nav.esci}
                title={testi.nav.esci}
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>
        )}
        <div className="px-6 py-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/termini" className="hover:underline">
            Termini
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-16 shrink-0 border-b border-[var(--glass-edge)] bg-[var(--glass-bg-strong)] flex items-center justify-between md:justify-end gap-2 px-4 md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden h-9 w-9 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Apri menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <LanguageSwitcher corrente={lingua} etichetta={testi.lingua.cambia} compatto />

            <div className="relative">
              <button
                type="button"
                onClick={toggleNotif}
                className="relative h-9 w-9 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-200 transition-colors"
                aria-label={testi.nav.notifiche}
                title={testi.nav.notifiche}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] text-[10px] font-semibold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] glass-card z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        Notifiche
                      </p>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                        {testi.nav.nessunaNotifica}
                      </p>
                    ) : (
                      <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                        {notifications.map((n) => (
                          <li key={n.id} className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              {!n.read_at && (
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {n.subject}
                                  </p>
                                  <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
                                    {timeAgo(n.created_at)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                  {n.body}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href="/messaggi"
                      onClick={() => setNotifOpen(false)}
                      className="block px-4 py-2.5 text-xs font-medium text-accent hover:underline text-center border-t border-gray-200 dark:border-white/10"
                    >
                      Vedi tutti i messaggi
                    </Link>
                  </div>
                </>
              )}
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
