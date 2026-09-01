"use client";

import { useActionState, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { signIncaricatoContract, type BecomeIncaricatoState } from "./actions";

const initialState: BecomeIncaricatoState = { error: null };

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

function SiNo({ name, label }: { name: string; label: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5">
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-4 shrink-0">
        {(["si", "no"] as const).map((v) => (
          <label key={v} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="radio"
              name={name}
              value={v}
              required
              className="h-4 w-4 border-gray-300 dark:border-white/20 text-accent focus:ring-accent/40"
            />
            {v === "si" ? "Sì" : "No"}
          </label>
        ))}
      </div>
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
}: {
  contractVersion: string;
  known: { label: string; value: string }[];
}) {
  const [state, formAction, pending] = useActionState(signIncaricatoContract, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewed, setPreviewed] = useState(false);

  async function handlePreview() {
    const form = formRef.current;
    if (!form) return;
    // I campi anagrafici vanno controllati prima: un'anteprima con metà dei
    // dati vuoti non serve a nulla. Le spunte di firma invece non sono
    // richieste per l'anteprima — si firma dopo aver letto.
    const required = form.querySelectorAll<HTMLInputElement>("input[required]:not([type=checkbox])");
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
          <Field label="Luogo di nascita" name="birth_place" required placeholder="es. Verona" />
          <Field label="Cittadinanza" name="citizenship" required placeholder="es. Italiana" />
          <Field label="Professione" name="profession" placeholder="es. Impiegato" />
          <Field
            label="Tipo di documento"
            name="document_type"
            required
            placeholder="es. Carta d'identità"
          />
          <Field label="Numero documento" name="document_number" required placeholder="es. CA12345AB" />
        </div>
      </Section>

      <Section title="Riferimenti bancari">
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
          Servono per l&apos;accredito delle provvigioni maturate. Puoi anche compilarli più avanti.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Banca" name="bank_name" />
          <Field label="Intestatario" name="bank_holder" />
          <Field label="IBAN" name="iban" />
          <Field label="Swift / BIC" name="swift" />
        </div>
      </Section>

      <Section title="Dichiarazioni Referente">
        <div className="divide-y divide-gray-100 dark:divide-white/5 -mt-1">
          <SiNo
            name="decl_other_companies"
            label="a) Sono incaricato da altre imprese di vendita diretta a domicilio"
          />
          <SiNo name="decl_has_vat" label="b) Sono in possesso di Partita IVA" />
          <SiNo
            name="decl_inps_exceeded"
            label="c) Ho superato i 5.000 € netti annui (rilevante ai fini INPS)"
          />
          <SiNo name="decl_public_employee" label="d) Sono un dipendente pubblico" />
        </div>
        <p className="rounded-lg bg-gray-50 dark:bg-white/5 px-4 py-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          e) Dichiaro di <strong>non</strong> essere stato dichiarato fallito, di <strong>non</strong>{" "}
          aver riportato condanne, di <strong>non</strong> avere carichi pendenti né di essere
          sottoposto a misure di prevenzione.
        </p>
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
          {pending ? "Firma in corso..." : "Firma e diventa incaricato"}
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
