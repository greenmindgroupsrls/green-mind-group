import Link from "next/link";
import { CalendarClock, ArrowRight, Users, PhoneCall } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/current-member";
import { getDizionario, linguaCorrente } from "@/i18n/dizionario";
import { LOCALE } from "@/i18n/config";

// Cosa mi aspetta questa settimana.
//
// "Cosa fare adesso" dice cosa e' urgente, il grafico dice come sta andando:
// mancava la domanda che uno si fa aprendo il back office la mattina.
//
// Sette giorni e non trenta: oltre quella soglia l'elenco diventa lungo e
// smette di essere una risposta, torna a essere un'agenda da leggere.

const GIORNI = 7;

export async function ProssimiImpegni({ activityCode }: { activityCode: number }) {
  if (!supabaseConfigured()) return null;

  const T = (await getDizionario()).impegni;
  const locale = LOCALE[await linguaCorrente()];
  const supabase = await createClient();

  const adesso = new Date();
  const limite = new Date(adesso.getTime() + GIORNI * 24 * 60 * 60 * 1000);
  const oggiIso = adesso.toISOString().slice(0, 10);

  const [{ data: attivita }, { data: eventi }] = await Promise.all([
    supabase
      .from("crm_tasks")
      .select("id, title, due_at, kind")
      .eq("owner_code", activityCode)
      .eq("done", false)
      .lte("due_at", limite.toISOString())
      .order("due_at", { ascending: true })
      .limit(6),
    supabase
      .from("events")
      .select("id, city, event_date, venue")
      .gte("event_date", oggiIso)
      .lte("event_date", limite.toISOString().slice(0, 10))
      .order("event_date", { ascending: true })
      .limit(3),
  ]);

  type Voce = { chiave: string; quando: Date; titolo: string; dettaglio: string | null; evento: boolean };

  const voci: Voce[] = [
    ...(attivita ?? []).map((a) => ({
      chiave: `t${a.id}`,
      quando: new Date(a.due_at),
      titolo: a.title,
      dettaglio: a.kind === "appuntamento" ? T.appuntamento : null,
      evento: false,
    })),
    ...(eventi ?? []).map((e) => ({
      chiave: `e${e.id}`,
      // L'evento ha solo la data: mezzogiorno lo tiene dopo le attivita' del
      // mattino e prima di quelle del pomeriggio, invece di finire sempre in
      // cima come farebbe la mezzanotte.
      quando: new Date(`${e.event_date}T12:00:00`),
      titolo: e.city,
      dettaglio: e.venue ?? T.evento,
      evento: true,
    })),
  ].sort((a, b) => a.quando.getTime() - b.quando.getTime());

  if (voci.length === 0) {
    return (
      <div className="glass-card p-4 sm:p-6">
        <Intestazione titolo={T.titolo} sottotitolo={T.sottotitolo} />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{T.nessuno}</p>
      </div>
    );
  }

  const inizioOggi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate());

  function quandoTestuale(d: Date): string {
    const giorni = Math.round(
      (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - inizioOggi.getTime()) /
        86_400_000,
    );
    const ora = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    if (giorni === 0) return `${T.oggi} ${ora}`;
    if (giorni === 1) return `${T.domani} ${ora}`;
    return `${d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })} ${ora}`;
  }

  return (
    <div className="glass-card p-4 sm:p-6">
      <Intestazione titolo={T.titolo} sottotitolo={T.sottotitolo} />
      <ul className="mt-4 flex flex-col gap-2">
        {voci.map((v) => {
          const Icona = v.evento ? Users : PhoneCall;
          return (
            <li key={v.chiave} className="flex items-start gap-2.5">
              <Icona
                size={14}
                className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm text-gray-900 dark:text-white truncate">{v.titolo}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {quandoTestuale(v.quando)}
                  {v.dettaglio ? ` · ${v.dettaglio}` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <Link
        href="/marketing/agenda"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        {T.vaiAllAgenda}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function Intestazione({ titolo, sottotitolo }: { titolo: string; sottotitolo: string }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <CalendarClock size={17} className="text-accent" />
        <h2 className="font-semibold text-gray-900 dark:text-white">{titolo}</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{sottotitolo}</p>
    </>
  );
}
