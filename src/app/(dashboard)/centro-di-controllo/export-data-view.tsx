import { Download } from "lucide-react";

const EXPORTS: { type: string; label: string; description: string }[] = [
  { type: "members", label: "Membri", description: "Elenco completo degli iscritti con rank e data di iscrizione." },
  { type: "sales", label: "Vendite", description: "Tutte le vendite registrate, per venditore e quantità." },
  {
    type: "commissions",
    label: "Commissioni",
    description: "Ogni commissione generata, per beneficiario e livello.",
  },
  {
    type: "withdrawals",
    label: "Prelievi",
    description: "Tutte le richieste di prelievo con stato e dati bancari.",
  },
];

export function ExportDataView() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {EXPORTS.map(({ type, label, description }) => (
        <div
          key={type}
          className="glass-card p-5 flex flex-col gap-3"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{label}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          </div>
          <a
            href={`/api/admin/export?type=${type}`}
            className="inline-flex items-center gap-2 self-start px-4 h-10 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
          >
            <Download size={16} />
            Esporta CSV
          </a>
        </div>
      ))}
    </div>
  );
}
