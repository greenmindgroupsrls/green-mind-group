"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Phone, Mail, MapPin, CalendarClock, X } from "lucide-react";
import { setLeadAppointment } from "./actions";

export type CalendarLead = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string | null;
  notes: string | null;
  status: string;
  requestedDate: string | null; // "2026-09-16"
  requestedTime: string | null; // "10:30"
  appointmentAt: string | null; // ISO
  assignedTo: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  nuovo: "Nuovo",
  contattato: "Contattato",
  convertito: "Convertito",
  perso: "Perso",
};

// Colori pieni: sulle pastiglie del calendario servono a distinguere lo
// stato a colpo d'occhio, senza dover leggere.
const STATUS_DOT: Record<string, string> = {
  nuovo: "bg-blue-500",
  contattato: "bg-amber-500",
  convertito: "bg-emerald-500",
  perso: "bg-gray-400",
};

const STATUS_CHIP: Record<string, string> = {
  nuovo: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  contattato: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  convertito: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  perso: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400",
};

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const GIORNI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

// Chiave "YYYY-MM-DD" in ora locale. Non si usa toISOString(), che converte
// in UTC e sposterebbe di un giorno gli appuntamenti serali.
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Data e ora effettive di un lead: l'appuntamento confermato se c'e',
// altrimenti quanto richiesto dal cliente dal sito.
function leadMoment(l: CalendarLead): { key: string; time: string; confermato: boolean } | null {
  if (l.appointmentAt) {
    const d = new Date(l.appointmentAt);
    return {
      key: dayKey(d),
      time: d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
      confermato: true,
    };
  }
  if (l.requestedDate) {
    return { key: l.requestedDate, time: l.requestedTime ?? "", confermato: false };
  }
  return null;
}

// Valore per <input type="datetime-local">, in ora locale.
function toInputValue(l: CalendarLead): string {
  if (l.appointmentAt) {
    const d = new Date(l.appointmentAt);
    return `${dayKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  if (l.requestedDate) return `${l.requestedDate}T${l.requestedTime || "09:00"}`;
  return "";
}

function DettaglioLead({ lead }: { lead: CalendarLead }) {
  const [pending, startTransition] = useTransition();
  const [valore, setValore] = useState(() => toInputValue(lead));
  const [errore, setErrore] = useState<string | null>(null);
  const m = leadMoment(lead);

  function salva(nuovo: string | null) {
    setErrore(null);
    startTransition(async () => {
      try {
        await setLeadAppointment(lead.id, nuovo);
      } catch (e) {
        setErrore(e instanceof Error ? e.message : "Errore imprevisto");
      }
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-white/10 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
          <div className="flex flex-col gap-0.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Phone size={11} /> {lead.phone}
            </span>
            <span className="flex items-center gap-1.5 truncate">
              <Mail size={11} /> {lead.email}
            </span>
            {lead.address && (
              <span className="flex items-center gap-1.5 truncate">
                <MapPin size={11} /> {lead.address}
              </span>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 text-xs font-medium rounded-full px-2.5 py-1 ${STATUS_CHIP[lead.status]}`}
        >
          {STATUS_LABEL[lead.status]}
        </span>
      </div>

      {lead.notes && (
        <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/5 rounded px-3 py-2">
          {lead.notes}
        </p>
      )}

      {m && !m.confermato && (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded px-3 py-2">
          Orario <strong>richiesto dal cliente</strong>, non ancora confermato.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Appuntamento confermato
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="datetime-local"
            value={valore}
            onChange={(e) => setValore(e.target.value)}
            disabled={pending}
            className="glass-input px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => salva(valore || null)}
            disabled={pending || !valore}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "..." : lead.appointmentAt ? "Aggiorna" : "Conferma"}
          </button>
          {lead.appointmentAt && (
            <button
              type="button"
              onClick={() => salva(null)}
              disabled={pending}
              className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
            >
              Annulla appuntamento
            </button>
          )}
        </div>
        {lead.assignedTo && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Inoltrato a <span className="font-medium">{lead.assignedTo}</span>
          </p>
        )}
        {errore && <p className="text-xs text-red-600 dark:text-red-400">{errore}</p>}
      </div>
    </div>
  );
}

export function LeadCalendar({ leads }: { leads: CalendarLead[] }) {
  const oggi = new Date();
  const [mese, setMese] = useState(() => new Date(oggi.getFullYear(), oggi.getMonth(), 1));
  const [giornoScelto, setGiornoScelto] = useState<string | null>(null);

  const perGiorno = useMemo(() => {
    const mappa = new Map<string, CalendarLead[]>();
    for (const l of leads) {
      const m = leadMoment(l);
      if (!m) continue;
      mappa.set(m.key, [...(mappa.get(m.key) ?? []), l]);
    }
    // ordina per orario dentro ogni giornata
    for (const [k, v] of mappa) {
      mappa.set(
        k,
        [...v].sort((a, b) => (leadMoment(a)?.time ?? "").localeCompare(leadMoment(b)?.time ?? "")),
      );
    }
    return mappa;
  }, [leads]);

  const senzaData = useMemo(() => leads.filter((l) => !leadMoment(l)), [leads]);

  // Griglia del mese che parte sempre di lunedì.
  const celle = useMemo(() => {
    const primo = new Date(mese.getFullYear(), mese.getMonth(), 1);
    const offset = (primo.getDay() + 6) % 7; // domenica=0 -> lunedì=0
    const inizio = new Date(primo);
    inizio.setDate(primo.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inizio);
      d.setDate(inizio.getDate() + i);
      return d;
    });
  }, [mese]);

  const chiaveOggi = dayKey(oggi);
  const leadDelGiorno = giornoScelto ? (perGiorno.get(giornoScelto) ?? []) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {MESI[mese.getMonth()]} {mese.getFullYear()}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMese(new Date(mese.getFullYear(), mese.getMonth() - 1, 1))}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
            aria-label="Mese precedente"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setMese(new Date(oggi.getFullYear(), oggi.getMonth(), 1))}
            className="px-3 h-8 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            Oggi
          </button>
          <button
            type="button"
            onClick={() => setMese(new Date(mese.getFullYear(), mese.getMonth() + 1, 1))}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
            aria-label="Mese successivo"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-white/10 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
        {GIORNI.map((g) => (
          <div
            key={g}
            className="bg-gray-50 dark:bg-white/5 px-1 py-2 text-center text-[11px] font-medium text-gray-500 dark:text-gray-400"
          >
            {g}
          </div>
        ))}

        {celle.map((d) => {
          const k = dayKey(d);
          const delMese = d.getMonth() === mese.getMonth();
          const items = perGiorno.get(k) ?? [];
          const isOggi = k === chiaveOggi;
          return (
            <button
              key={k}
              type="button"
              onClick={() => items.length > 0 && setGiornoScelto(k)}
              disabled={items.length === 0}
              className={`min-h-[74px] p-1.5 text-left align-top transition-colors ${
                delMese ? "bg-white/60 dark:bg-white/[0.05]" : "bg-gray-50/40 dark:bg-white/[0.015]"
              } ${items.length > 0 ? "hover:bg-accent/5 cursor-pointer" : "cursor-default"} ${
                giornoScelto === k ? "ring-2 ring-inset ring-accent" : ""
              }`}
            >
              <span
                className={`inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-[11px] font-medium ${
                  isOggi
                    ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                    : delMese
                      ? "text-gray-700 dark:text-gray-300"
                      : "text-gray-400 dark:text-gray-600"
                }`}
              >
                {d.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 mt-1">
                {items.slice(0, 2).map((l) => {
                  const m = leadMoment(l);
                  return (
                    <span
                      key={l.id}
                      className="flex items-center gap-1 text-[10px] text-gray-700 dark:text-gray-300 truncate"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[l.status]} ${
                          m?.confermato ? "" : "opacity-40"
                        }`}
                      />
                      <span className="truncate">
                        {m?.time && `${m.time} `}
                        {l.name}
                      </span>
                    </span>
                  );
                })}
                {items.length > 2 && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    +{items.length - 2} altri
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500 dark:text-gray-400">
        {Object.entries(STATUS_LABEL).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[k]}`} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gray-400 opacity-40" />
          Pallino sbiadito = orario richiesto, non confermato
        </span>
      </div>

      {giornoScelto && (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarClock size={16} className="text-accent" />
              {new Date(`${giornoScelto}T12:00`).toLocaleDateString("it-IT", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h4>
            <button
              type="button"
              onClick={() => setGiornoScelto(null)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Chiudi"
            >
              <X size={15} />
            </button>
          </div>
          {leadDelGiorno.map((l) => (
            <DettaglioLead key={l.id} lead={l} />
          ))}
        </div>
      )}

      {senzaData.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 flex flex-col gap-3">
          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
            Senza data ({senzaData.length})
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            Richieste arrivate senza un orario indicato: fissa tu l&apos;appuntamento.
          </p>
          {senzaData.map((l) => (
            <DettaglioLead key={l.id} lead={l} />
          ))}
        </div>
      )}

      {leads.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          Nessun lead ricevuto finora.
        </p>
      )}
    </div>
  );
}
