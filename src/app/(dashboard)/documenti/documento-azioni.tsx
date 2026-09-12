"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, FileDown, Loader2, PenLine, Send } from "lucide-react";
import { FirmaPad } from "@/components/firma-pad";
import { generaDocumento, inviaLinkFirma, salvaFirma } from "./actions";
import {
  DOCUMENTO_LABEL,
  RUOLO_LABEL,
  firmaADistanzaAmmessa,
  type RuoloFirma,
  type StatoDocumento,
  type TipoDocumento,
} from "@/lib/documenti";

// LE AZIONI SU UN DOCUMENTO
//
// Raccogliere le firme, mandarle a chiedere per email, chiudere il
// documento. Tutto in un componente solo perche' sono tre passaggi della
// stessa scena: l'incaricato e' davanti al cliente e deve vedere cosa
// manca senza cambiare pagina.

type FirmaFatta = { ruolo: RuoloFirma; firmatario: string; firmatoIl: string; metodo: string };

export function DocumentoAzioni({
  documentId,
  tipo,
  stato,
  clienteNome,
  clienteEmail,
  ruoliRichiesti,
  firme,
  nomeIncaricato,
}: {
  documentId: number;
  tipo: TipoDocumento;
  stato: StatoDocumento;
  clienteNome: string;
  clienteEmail: string | null;
  ruoliRichiesti: RuoloFirma[];
  firme: FirmaFatta[];
  nomeIncaricato: string;
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);
  const [padAperto, setPadAperto] = useState<RuoloFirma | null>(null);
  const [nomeFirmatario, setNomeFirmatario] = useState("");
  const [emailLink, setEmailLink] = useState(clienteEmail ?? "");

  const firmato = (ruolo: RuoloFirma) => firme.find((f) => f.ruolo === ruolo);
  const mancanti = ruoliRichiesti.filter((r) => !firmato(r));
  const chiuso = stato !== "bozza";

  const apriPad = (ruolo: RuoloFirma) => {
    setErrore(null);
    setEsito(null);
    setNomeFirmatario(ruolo === "cliente" ? clienteNome : nomeIncaricato);
    setPadAperto(ruolo);
  };

  const confermaFirma = (ruolo: RuoloFirma, png: string) => {
    avvia(async () => {
      const risultato = await salvaFirma(documentId, ruolo, nomeFirmatario, png);
      if (risultato.error) {
        setErrore(risultato.error);
        return;
      }
      setPadAperto(null);
      setEsito(`Firma di ${RUOLO_LABEL[ruolo].toLowerCase()} registrata.`);
      router.refresh();
    });
  };

  const mandaLink = () => {
    setErrore(null);
    setEsito(null);
    avvia(async () => {
      const risultato = await inviaLinkFirma(documentId, emailLink);
      if (risultato.error) {
        setErrore(risultato.error);
        return;
      }
      setEsito(`Link inviato a ${emailLink}. Il cliente può firmare dal suo telefono.`);
      router.refresh();
    });
  };

  const chiudi = () => {
    setErrore(null);
    setEsito(null);
    avvia(async () => {
      const risultato = await generaDocumento(documentId);
      if (risultato.error) {
        setErrore(risultato.error);
        return;
      }
      setEsito("Documento generato e archiviato.");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card p-4 sm:p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Firme</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {chiuso
              ? "Il documento è chiuso: le firme non si possono più modificare."
              : "Fai firmare col dito sullo schermo, oppure manda il link al cliente."}
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {ruoliRichiesti.map((ruolo) => {
            const fatta = firmato(ruolo);
            return (
              <li
                key={ruolo}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between rounded-xl border border-gray-200 dark:border-white/10 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {RUOLO_LABEL[ruolo]}
                  </p>
                  {fatta ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                      <Check size={13} />
                      {fatta.firmatario} · {fatta.firmatoIl}
                      {fatta.metodo === "link" ? " · firmato a distanza" : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Ancora da firmare</p>
                  )}
                </div>

                {!fatta && !chiuso && (
                  <button
                    type="button"
                    onClick={() => apriPad(ruolo)}
                    disabled={inCorso}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors disabled:opacity-50"
                  >
                    <PenLine size={15} />
                    Firma qui
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {!chiuso && ruoliRichiesti.some(firmaADistanzaAmmessa) && !firmato("cliente") && (
          <div className="border-t border-gray-200 dark:border-white/10 pt-4 flex flex-col sm:flex-row gap-2 sm:items-end">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Oppure: fai firmare il cliente dal suo telefono
              </span>
              <input
                type="email"
                value={emailLink}
                onChange={(e) => setEmailLink(e.target.value)}
                placeholder="email del cliente"
                className="h-11 w-full glass-input px-3.5 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={mandaLink}
              disabled={inCorso || !emailLink}
              className="inline-flex items-center justify-center gap-2 px-4 h-11 rounded-lg glass-btn-soft text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-50"
            >
              <Send size={15} />
              Invia link
            </button>
          </div>
        )}
      </div>

      {errore && (
        <p className="rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-sm px-4 py-2.5">
          {errore}
        </p>
      )}
      {esito && !errore && (
        <p className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-2.5">
          {esito}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {!chiuso ? (
          <button
            type="button"
            onClick={chiudi}
            disabled={inCorso || mancanti.length > 0}
            className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold disabled:opacity-40"
          >
            {inCorso ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            {mancanti.length > 0
              ? `Mancano ${mancanti.length} firme`
              : "Genera il documento firmato"}
          </button>
        ) : (
          <a
            href={`/api/documenti/${documentId}/pdf`}
            className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold"
          >
            <FileDown size={16} />
            Scarica il PDF firmato
          </a>
        )}
      </div>

      {padAperto && (
        <FirmaPad
          titolo={`Firma ${RUOLO_LABEL[padAperto].toLowerCase()}`}
          sottotitolo={DOCUMENTO_LABEL[tipo]}
          inCorso={inCorso}
          onChiudi={() => setPadAperto(null)}
          onFirma={(png) => confermaFirma(padAperto, png)}
        />
      )}
    </div>
  );
}
