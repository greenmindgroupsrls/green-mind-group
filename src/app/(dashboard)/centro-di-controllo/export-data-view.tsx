"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Download, FileText, Loader2 } from "lucide-react";

// ESPORTAZIONI
//
// Due modi di guardare gli stessi dati. Il CSV mette tutti in un file solo,
// ed e' quello che serve al commercialista. L'elenco invece risponde a
// "cosa ha fatto questa persona in questo mese": si apre la voce, compare chi
// ha qualcosa in quel mese, e accanto a ogni nome c'e' il suo PDF.

type Tipo = "orders" | "withdrawals" | "sales" | "commissions" | "members";

const VOCI: { tipo: Tipo; titolo: string; descrizione: string; unita: "euro" | "pezzi" | null }[] = [
  {
    tipo: "orders",
    titolo: "Ordini",
    descrizione: "Chi ha ordinato nel mese, con codici prodotto, fatturazione e spedizione.",
    unita: "euro",
  },
  {
    tipo: "withdrawals",
    titolo: "Prelievi",
    descrizione: "Chi ha chiesto un prelievo nel mese, con importi, trattenute e stato.",
    unita: "euro",
  },
  {
    tipo: "sales",
    titolo: "Vendite",
    descrizione: "Chi ha venduto nel mese e quanti pezzi.",
    unita: "pezzi",
  },
  {
    tipo: "commissions",
    titolo: "Commissioni",
    descrizione: "Chi ha maturato provvigioni nel mese, riga per riga.",
    unita: "euro",
  },
  {
    tipo: "members",
    titolo: "Membri",
    descrizione: "La scheda di ogni iscritto: anagrafica, sponsor, qualifica e squadra.",
    unita: null,
  },
];

type Riga = { codice: number; codiceFormattato: string; nome: string; quanti: number | null; totale: number | null };

function meseCorrente(): string {
  const oggi = new Date();
  return `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, "0")}`;
}

function euro(v: number) {
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function Elenco({ tipo, mese, unita }: { tipo: Tipo; mese: string; unita: "euro" | "pezzi" | null }) {
  const [stato, setStato] = useState<{ chiave: string; righe: Riga[] | null; errore: string | null }>({
    chiave: "",
    righe: null,
    errore: null,
  });
  const conMese = tipo !== "members";
  const chiave = conMese ? `${tipo}|${mese}` : tipo;

  useEffect(() => {
    let vivo = true;
    const url = `/api/admin/export/elenco?tipo=${tipo}${conMese ? `&mese=${mese}` : ""}`;
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "Errore");
        return r.json();
      })
      .then((d) => vivo && setStato({ chiave, righe: d.righe ?? [], errore: null }))
      .catch((e) => vivo && setStato({ chiave, righe: null, errore: String(e.message ?? e) }));
    return () => {
      vivo = false;
    };
  }, [tipo, mese, conMese, chiave]);

  // Finche' la risposta non e' quella del mese scelto adesso, si mostra il
  // caricamento: altrimenti cambiando mese resterebbe a schermo per un
  // attimo l'elenco del mese prima, con i nomi sbagliati accanto ai PDF.
  if (stato.chiave !== chiave) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-3">
        <Loader2 size={14} className="animate-spin" /> Caricamento…
      </p>
    );
  }
  if (stato.errore) {
    return <p className="text-sm text-red-600 dark:text-red-400 py-3">{stato.errore}</p>;
  }
  if (!stato.righe || stato.righe.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-3">
        {conMese ? "Nessuno in questo mese." : "Nessun membro."}
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-gray-100 dark:divide-white/5 max-h-80 overflow-y-auto -mx-1">
      {stato.righe.map((r) => {
        const pdf = `/api/admin/export/pdf?tipo=${tipo}&membro=${r.codice}${conMese ? `&mese=${mese}` : ""}`;
        return (
          <li key={r.codice} className="flex items-center justify-between gap-3 px-1 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                <span className="font-normal text-gray-500 dark:text-gray-400">{r.codiceFormattato}</span>{" "}
                {r.nome}
              </p>
              {r.quanti !== null && (
                <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  {r.quanti} {r.quanti === 1 ? "voce" : "voci"}
                  {unita === "euro" && r.totale !== null && ` · ${euro(r.totale)}`}
                  {unita === "pezzi" && r.totale !== null && ` · ${r.totale} ${r.totale === 1 ? "pezzo" : "pezzi"}`}
                </p>
              )}
            </div>
            <a
              href={pdf}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
            >
              <FileText size={14} />
              PDF
            </a>
          </li>
        );
      })}
    </ul>
  );
}

type RigaDocumento = {
  id: number;
  numero: string;
  tipo: string;
  stato: string;
  firmato: boolean;
  cliente: string;
  incaricato: string;
  creatoIl: string;
  haPdf: boolean;
};

// I DOCUMENTI FIRMATI DEL MESE
//
// Stessa logica delle altre voci — si apre l'elenco e accanto a ogni riga
// c'e' il suo PDF — ma qui il PDF non si genera al volo: e' il documento
// che il cliente ha firmato, archiviato cosi' com'era al momento della
// firma.
function DocumentiFirmati({ mese }: { mese: string }) {
  const [stato, setStato] = useState<{ chiave: string; righe: RigaDocumento[] | null; errore: string | null }>({
    chiave: "",
    righe: null,
    errore: null,
  });

  useEffect(() => {
    let vivo = true;
    fetch(`/api/admin/export/documenti?mese=${mese}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "Errore");
        return r.json();
      })
      .then((d) => vivo && setStato({ chiave: mese, righe: d.righe ?? [], errore: null }))
      .catch((e) => vivo && setStato({ chiave: mese, righe: null, errore: String(e.message ?? e) }));
    return () => {
      vivo = false;
    };
  }, [mese]);

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Documenti firmati</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Contratti di vendita, informative, verbali di consegna e contratti incaricato firmati nel
          mese, con il PDF archiviato di ognuno.
        </p>
      </div>

      {stato.chiave !== mese ? (
        <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-3">
          <Loader2 size={14} className="animate-spin" /> Caricamento…
        </p>
      ) : stato.errore ? (
        <p className="text-sm text-red-600 dark:text-red-400 py-3">{stato.errore}</p>
      ) : !stato.righe || stato.righe.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-3">Nessun documento in questo mese.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100 dark:divide-white/5 max-h-96 overflow-y-auto -mx-1">
          {stato.righe.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-1 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {r.tipo} · {r.cliente}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {r.numero} · {r.incaricato} · {r.stato}
                </p>
              </div>
              {r.haPdf ? (
                <a
                  href={`/api/documenti/${r.id}/pdf`}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
                >
                  <FileText size={14} />
                  PDF
                </a>
              ) : (
                <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">Da firmare</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ExportDataView() {
  const [mese, setMese] = useState(meseCorrente);
  const [aperte, setAperte] = useState<Set<Tipo>>(new Set());

  const alterna = (tipo: Tipo) =>
    setAperte((prima) => {
      const dopo = new Set(prima);
      if (dopo.has(tipo)) dopo.delete(tipo);
      else dopo.add(tipo);
      return dopo;
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Mese</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Vale per gli elenchi di ordini, prelievi, vendite e commissioni. Il CSV contiene sempre tutto.
          </p>
        </div>
        <input
          type="month"
          value={mese}
          max={meseCorrente()}
          onChange={(e) => e.target.value && setMese(e.target.value)}
          className="h-10 glass-input px-3 text-sm w-full sm:w-auto"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {VOCI.map(({ tipo, titolo, descrizione, unita }) => {
          const aperta = aperte.has(tipo);
          return (
            <div key={tipo} className="glass-card p-4 sm:p-5 flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{titolo}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{descrizione}</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => alterna(tipo)}
                  aria-expanded={aperta}
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-lg glass-btn-soft text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  <ChevronDown size={16} className={`transition-transform ${aperta ? "rotate-180" : ""}`} />
                  {aperta ? "Chiudi elenco" : "Apri elenco"}
                </button>
                <a
                  href={`/api/admin/export?type=${tipo}`}
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
                >
                  <Download size={16} />
                  Esporta CSV
                </a>
              </div>

              {aperta && (
                <div className="border-t border-gray-200 dark:border-white/10 pt-1">
                  <Elenco tipo={tipo} mese={mese} unita={unita} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <DocumentiFirmati mese={mese} />
    </div>
  );
}
