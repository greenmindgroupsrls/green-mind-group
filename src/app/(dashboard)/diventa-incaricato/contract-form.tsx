"use client";

import { useActionState, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { signIncaricatoContract, type BecomeIncaricatoState } from "./actions";
import { BankFields } from "@/components/bank-fields";
import { PROVINCE_ITALIANE } from "@/lib/province";

const initialState: BecomeIncaricatoState = { error: null };

// EE e' il codice usato dall'amministrazione italiana per indicare uno
// stato estero (lo stesso della lettera nel codice fiscale di chi e' nato
// fuori dall'Italia): copre tutte le cittadinanze non italiane.
const CITTADINANZE = [
  { value: "Italiana", label: "Italiana" },
  { value: "EE", label: "EE - Straniera (stato estero)" },
];

const SITUAZIONI_LAVORATIVE = [
  { value: "disoccupato", label: "Disoccupato" },
  {
    value: "gestione_previdenziale",
    label: "Iscritto alla gestione previdenziale (dipendente, autonomo o professionista)",
  },
  { value: "pensionato", label: "Pensionato" },
];

const TIPI_DOCUMENTO = [
  { value: "Carta d'identità", label: "Carta d'identità" },
  { value: "Passaporto", label: "Passaporto" },
  { value: "Patente di guida", label: "Patente di guida" },
  { value: "Permesso di soggiorno", label: "Permesso di soggiorno" },
];

const inputClass =
  "h-11 w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";
const checkboxClass =
  "h-4 w-4 mt-0.5 shrink-0 rounded border-gray-300 dark:border-white/20 text-accent focus:ring-accent/40";

function Field({
  label,
  name,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>
        {label}
        {required && " *"}
      </span>
      <input name={name} required={required} placeholder={placeholder} className={inputClass} />
    </label>
  );
}

// Elenchi chiusi: meglio una tendina di un campo libero, che genera
// varianti ("C.I.", "carta identita'", "Carta d'Identita'") impossibili da
// confrontare poi tra loro.
function Select({
  label,
  name,
  required,
  options,
}: {
  label: string;
  name: string;
  required?: boolean;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>
        {label}
        {required && " *"}
      </span>
      <select name={name} required={required} defaultValue="" className={inputClass}>
        <option value="" disabled>
          Seleziona...
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SiNo({
  name,
  label,
  onChange,
}: {
  name: string;
  label: string;
  onChange?: (valore: boolean) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 py-2.5">
      <span className="text-sm text-gray-600 dark:text-gray-300 sm:pr-6">{label}</span>
      <div className="flex items-center gap-4 shrink-0">
        {(["si", "no"] as const).map((v) => (
          <label key={v} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="radio"
              name={name}
              value={v}
              required
              onChange={() => onChange?.(v === "si")}
              className="h-4 w-4 border-gray-300 dark:border-white/20 text-accent focus:ring-accent/40"
            />
            {v === "si" ? "Sì" : "No"}
          </label>
        ))}
      </div>
    </div>
  );
}

// Dichiarazioni che devono essere vere per poter firmare: spunta
// obbligatoria, non una scelta.
function Afferma({ name, testo }: { name: string; testo: string }) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed cursor-pointer">
      <input type="checkbox" name={name} required className={checkboxClass} />
      <span>{testo}</span>
    </label>
  );
}

// Scelta fra due alternative descritte per esteso, incolonnate.
function Radio({
  name,
  opzioni,
}: {
  name: string;
  opzioni: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {opzioni.map((o) => (
        <label
          key={o.value}
          className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed cursor-pointer"
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            required
            className="h-4 w-4 mt-0.5 shrink-0 border-gray-300 dark:border-white/20 text-accent focus:ring-accent/40"
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm flex flex-col gap-4">
      <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
      {children}
    </div>
  );
}

export function ContractForm({
  contractVersion,
  known,
  alreadyIncaricato = false,
}: {
  contractVersion: string;
  known: { label: string; value: string }[];
  alreadyIncaricato?: boolean;
}) {
  const [state, formAction, pending] = useActionState(signIncaricatoContract, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewed, setPreviewed] = useState(false);
  // Regime fiscale e situazione da dipendente pubblico si chiedono solo
  // a chi risponde di si': chiederli a tutti sarebbe rumore.
  const [haPiva, setHaPiva] = useState<boolean | null>(null);
  const [dipPubblico, setDipPubblico] = useState<boolean | null>(null);

  async function handlePreview() {
    const form = formRef.current;
    if (!form) return;
    // I campi anagrafici vanno controllati prima: un'anteprima con metà dei
    // dati vuoti non serve a nulla. Le spunte di firma invece non sono
    // richieste per l'anteprima — si firma dopo aver letto.
    const required = form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "input[required]:not([type=checkbox]), select[required]",
    );
    for (const el of required) {
      if (!el.checkValidity()) {
        el.reportValidity();
        return;
      }
    }

    setPreviewing(true);
    setPreviewError(null);
    try {
      const res = await fetch("/api/contratto-incaricato", {
        method: "POST",
        body: new FormData(form),
      });
      if (!res.ok) throw new Error("Generazione non riuscita");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setPreviewed(true);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Errore imprevisto");
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="contract_version" value={contractVersion} />

      <Section title="Dati già presenti a sistema">
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
          Vengono inseriti automaticamente nel contratto. Per modificarli usa Impostazioni.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {known.map((k) => (
            <div key={k.label} className="flex justify-between gap-3 text-sm border-b border-gray-100 dark:border-white/5 pb-1.5">
              <span className="text-gray-500 dark:text-gray-400">{k.label}</span>
              <span className="text-gray-900 dark:text-white font-medium text-right">
                {k.value || "—"}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Dati da completare">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Comune di nascita" name="birth_place" required placeholder="es. Verona" />
          <Select label="Provincia di nascita" name="birth_province" required options={PROVINCE_ITALIANE} />
          <Select label="Cittadinanza" name="citizenship" required options={CITTADINANZE} />
          <Field label="Professione" name="profession" placeholder="es. Impiegato" />
          <Select label="Tipo di documento" name="document_type" required options={TIPI_DOCUMENTO} />
          <Field label="Numero documento" name="document_number" required placeholder="es. CA12345AB" />
        </div>
      </Section>

      <Section title="Riferimenti bancari">
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
          Servono per l&apos;accredito delle provvigioni maturate. Puoi anche compilarli più avanti.
        </p>
        <BankFields />
      </Section>

      <Section title="Dichiarazioni Referente">
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
          Le prime quattro sono condizioni necessarie per l&apos;incarico: senza, non si può
          firmare. Le altre servono a inquadrare la tua posizione.
        </p>

        <div className="flex flex-col gap-3">
          <Afferma
            name="decl_adult"
            testo="a) Dichiaro di essere maggiorenne (di aver compiuto il 18° anno d'età) e di essere in possesso della capacità di agire, oltre che di intendere e di volere."
          />
          <Afferma
            name="decl_honorability"
            testo="b) Dichiaro di essere in possesso dei requisiti di onorabilità di cui all'Art. 71 del D.Lgs. n. 59/2010, previsti ai fini dello svolgimento dell'attività di Incaricato alle vendite."
          />
          <Afferma
            name="decl_no_compete"
            testo="c) Dichiaro di non essere vincolato ad alcun soggetto terzo da alcun accordo di non concorrenza, o accordo limitativo di altro genere."
          />
          <Afferma
            name="decl_no_conflict"
            testo="d) Dichiaro che lo svolgimento dell'attività di Incaricato non è in conflitto, né genera alcun conflitto di interessi, con qualsivoglia lavoro o attività, anche professionale, e che non necessito di alcuna approvazione o autorizzazione da parte del mio datore di lavoro, socio in affari o di qualsivoglia terza parte."
          />
        </div>

        <div className="divide-y divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5 pt-1">
          <SiNo
            name="decl_earned_threshold"
            label="e) Con riferimento all'anno corrente, ho guadagnato 6.410,00 € lordi dall'attività di Incaricato"
          />
        </div>

        <Select
          label="f) La mia situazione lavorativa e previdenziale"
          name="decl_employment_status"
          required
          options={SITUAZIONI_LAVORATIVE}
        />

        <div className="divide-y divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5 pt-1">
          <SiNo
            name="decl_has_vat"
            label="g) Possiedo una partita IVA inerente al presente contratto di collaborazione"
            onChange={setHaPiva}
          />
        </div>

        {haPiva === true && (
          <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-4 flex flex-col gap-3">
            <Field
              label="Numero di partita IVA"
              name="decl_vat_number"
              required
              placeholder="11 cifre, es. 01234567890"
            />
            <Field
              label="Regime fiscale della partita IVA"
              name="decl_vat_regime"
              required
              placeholder="es. Regime forfettario"
            />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Ricorda di allegare il certificato di attribuzione della partita IVA: senza, il
              contratto resta incompleto.
            </p>
          </div>
        )}

        <div className="divide-y divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5 pt-1">
          <SiNo
            name="decl_public_employee"
            label="h) Sono un dipendente pubblico"
            onChange={setDipPubblico}
          />
        </div>

        {dipPubblico === true && (
          <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-4 flex flex-col gap-3">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              In ottemperanza all&apos;Art. 53 del D.Lgs. n. 165/2001, indica la tua situazione:
            </p>
            <Radio
              name="decl_public_full_time"
              opzioni={[
                {
                  value: "no",
                  label:
                    "Sono un dipendente pubblico part-time al 50%: non occorre l'autorizzazione dell'Ente di appartenenza.",
                },
                {
                  value: "si",
                  label:
                    "Sono a tempo pieno, o part-time in misura eccedente il 50%, e ho ottenuto l'autorizzazione dell'Ente di appartenenza.",
                },
              ]}
            />
          </div>
        )}
      </Section>

      <Section title="Genera e firma">
        <Field label="Luogo di firma" name="signing_place" required placeholder="es. Verona" />

        <div className="rounded-lg border border-dashed border-gray-300 dark:border-white/15 p-4 flex flex-col gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Genera il contratto compilato e leggilo prima di firmare.
          </p>
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-accent text-accent px-4 py-2.5 text-sm font-medium hover:bg-accent/5 transition-colors disabled:opacity-50"
          >
            {previewing ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            {previewing ? "Generazione..." : "Genera contratto"}
          </button>
          {previewed && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Contratto generato: si è aperto in una nuova scheda. Rigeneralo se modifichi i dati.
            </p>
          )}
          {previewError && (
            <p className="text-xs text-red-600 dark:text-red-400">{previewError}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-1">
          <label className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" name="accetto_contratto" required className={checkboxClass} />
            <span>
              Ho letto e accetto integralmente il <strong>contratto di Incaricato alle Vendite</strong>.
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" name="accetto_clausole" required className={checkboxClass} />
            <span>
              Ai sensi e per gli effetti degli <strong>artt. 1341 e 1342 c.c.</strong> approvo
              specificamente gli articoli 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13 e 16.
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" name="accetto_dichiarazioni" required className={checkboxClass} />
            <span>Confermo la veridicità delle Dichiarazioni Referente sopra riportate.</span>
          </label>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Firmando vengono registrati data, ora e indirizzo IP dell&apos;accettazione, come prova
          della firma elettronica.
        </p>

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending
            ? "Firma in corso..."
            : alreadyIncaricato
              ? "Firma il contratto"
              : "Firma e diventa incaricato"}
        </button>

        {state.error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
      </Section>
    </form>
  );
}
