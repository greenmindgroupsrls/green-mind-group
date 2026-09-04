import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Mail,
  PhoneCall,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/current-member";

// Il cruscotto racconta come sta andando. Questo pannello risponde all'altra
// domanda, quella che uno si fa davvero aprendo il back office: cosa devo
// fare adesso. Ogni voce nasce da un dato reale e porta dove si risolve.
//
// Il contratto da firmare NON compare qui di proposito: ha gia' il suo
// avviso in cima alla pagina, ed e' piu' visibile di questo riquadro. Dirlo
// due volte nella stessa schermata lo renderebbe solo piu' facile da
// ignorare.

type Azione = {
  chiave: string;
  icona: LucideIcon;
  testo: string;
  dettaglio?: string;
  href: string;
  etichettaLink: string;
  urgente?: boolean;
};

function euro(v: number) {
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export async function NextActions({ activityCode }: { activityCode: number }) {
  if (!supabaseConfigured()) return null;

  const supabase = await createClient();
  const oggi = new Date().toISOString().slice(0, 10);

  const [
    { data: io },
    { data: impostazioni },
    { data: rango },
    { data: provvigioni },
    { data: prelievi },
    { data: profiloCompleto },
    { data: leadDaChiamare },
    { data: messaggiNonLetti },
    { data: prossimoEvento },
  ] = await Promise.all([
    supabase.from("members").select("passed_up_count, role").eq("activity_code", activityCode).maybeSingle(),
    supabase
      .from("compensation_settings")
      .select("plan2_active_from, plan2_passup_quota")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("member_ranks").select("rank").eq("activity_code", activityCode).maybeSingle(),
    supabase.from("commission_entries").select("amount").eq("beneficiary_code", activityCode),
    supabase
      .from("withdrawal_requests")
      .select("net_amount, status")
      .eq("activity_code", activityCode)
      .neq("status", "rejected"),
    supabase.rpc("is_profile_complete", { p_activity_code: activityCode }),
    supabase
      .from("leads")
      .select("id")
      .eq("assigned_to", activityCode)
      .is("appointment_at", null),
    supabase
      .from("messages")
      .select("id")
      .eq("recipient_code", activityCode)
      .is("read_at", null),
    supabase
      .from("events")
      .select("city, event_date")
      .gte("event_date", oggi)
      .order("event_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const azioni: Azione[] = [];

  // 1. Quanto manca alla qualifica: e' l'unica cosa che cambia la posizione
  //    di una persona nel piano, quindi viene prima di tutto.
  const quota = impostazioni?.plan2_passup_quota ?? 2;
  const cedute = io?.passed_up_count ?? 0;
  const sistema2Attivo = Boolean(impostazioni?.plan2_active_from);
  if (sistema2Attivo && rango?.rank === "standard" && cedute < quota) {
    const mancanti = quota - cedute;
    azioni.push({
      chiave: "vip",
      icona: TrendingUp,
      testo:
        mancanti === 1
          ? "Ti manca una vendita per diventare VIP"
          : `Ti mancano ${mancanti} vendite per diventare VIP`,
      dettaglio:
        "Dopo la qualifica i tuoi iscritti restano nella tua struttura e i pass-up arrivano a te.",
      href: "/registrazione",
      etichettaLink: "Registra una vendita",
    });
  }

  // 2. Soldi fermi: o mancano i dati per prenderli, o si possono chiedere.
  const guadagnato = (provvigioni ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const gia = (prelievi ?? []).reduce((s, r) => s + Number(r.net_amount), 0);
  const disponibile = guadagnato - gia;
  if (disponibile > 0) {
    if (profiloCompleto === false) {
      azioni.push({
        chiave: "profilo",
        icona: Wallet,
        testo: `Hai ${euro(disponibile)} da riscuotere, ma il profilo è incompleto`,
        dettaglio: "Senza i dati anagrafici e bancari il prelievo resta bloccato.",
        href: "/impostazioni",
        etichettaLink: "Completa il profilo",
        urgente: true,
      });
    } else {
      azioni.push({
        chiave: "prelievo",
        icona: Wallet,
        testo: `Hai ${euro(disponibile)} disponibili`,
        href: "/payout",
        etichettaLink: "Richiedi il prelievo",
      });
    }
  }

  // 3. Lead assegnati senza appuntamento: sono persone che hanno chiesto di
  //    essere contattate e stanno aspettando.
  const lead = leadDaChiamare?.length ?? 0;
  if (lead > 0) {
    azioni.push({
      chiave: "lead",
      icona: PhoneCall,
      testo: lead === 1 ? "Hai 1 lead da richiamare" : `Hai ${lead} lead da richiamare`,
      dettaglio: "Hanno chiesto di essere contattati e non hanno ancora un appuntamento.",
      href: "/marketing/lead",
      etichettaLink: "Vai ai lead",
      urgente: true,
    });
  }

  const messaggi = messaggiNonLetti?.length ?? 0;
  if (messaggi > 0) {
    azioni.push({
      chiave: "messaggi",
      icona: Mail,
      testo: messaggi === 1 ? "Hai 1 messaggio non letto" : `Hai ${messaggi} messaggi non letti`,
      href: "/messaggi",
      etichettaLink: "Leggi",
    });
  }

  if (prossimoEvento) {
    const quando = new Date(prossimoEvento.event_date).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
    });
    azioni.push({
      chiave: "evento",
      icona: CalendarClock,
      testo: `Prossimo evento: ${prossimoEvento.city}, ${quando}`,
      dettaglio: "Porta un ospite: è il modo più semplice per far partire una vendita.",
      href: "/eventi",
      etichettaLink: "Dettagli",
    });
  }

  // Chi non ha nulla in sospeso non deve vedere un riquadro vuoto: vede la
  // cosa che conta comunque, cioe' portare qualcuno.
  if (azioni.length === 0) {
    azioni.push({
      chiave: "tutto-ok",
      icona: UserPlus,
      testo: "Non hai nulla in sospeso",
      dettaglio: "Il prossimo passo è sempre lo stesso: far entrare qualcuno di nuovo.",
      href: "/iscrivi",
      etichettaLink: "Iscrivi una persona",
    });
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={17} className="text-accent" />
        <h2 className="font-semibold text-gray-900 dark:text-white">Cosa fare adesso</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Quello che ti riguarda oggi, in ordine di importanza
      </p>

      <ul className="mt-4 flex flex-col gap-2.5">
        {azioni.map((a) => {
          const Icona = a.icona;
          return (
            <li
              key={a.chiave}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg px-4 py-3 border ${
                a.urgente
                  ? "border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10"
                  : "border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5"
              }`}
            >
              <Icona
                size={18}
                className={`shrink-0 ${
                  a.urgente ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{a.testo}</p>
                {a.dettaglio && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{a.dettaglio}</p>
                )}
              </div>
              <Link
                href={a.href}
                className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                {a.etichettaLink}
                <ArrowRight size={14} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
