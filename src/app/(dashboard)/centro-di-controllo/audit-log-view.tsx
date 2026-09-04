"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatActivityCode } from "@/lib/activity-code";

export type AuditLogRow = {
  id: number;
  actionType: string;
  targetCode: number | null;
  targetName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  rank_override_set: "Rank forzato",
  rank_override_cleared: "Rank forzato rimosso",
  member_profile_updated: "Anagrafica modificata",
  withdrawal_status_updated: "Stato prelievo aggiornato",
  shop_order_status_updated: "Stato ordine aggiornato",
  announcement_created: "Annuncio creato",
  event_deleted: "Evento eliminato",
  member_suspended: "Account sospeso",
  member_unsuspended: "Account riattivato",
  compensation_settings_updated: "Parametri piano compensi modificati",
  marketing_document_updated: "Documento marketing aggiornato",
};

function formatDetails(details: Record<string, unknown> | null) {
  if (!details || Object.keys(details).length === 0) return "—";
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditLogView({ entries }: { entries: AuditLogRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const label = ACTION_LABELS[e.actionType] ?? e.actionType;
      return (
        label.toLowerCase().includes(q) ||
        (e.targetName ?? "").toLowerCase().includes(q) ||
        formatDetails(e.details).toLowerCase().includes(q)
      );
    });
  }, [entries, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative sm:w-80">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca nel registro"
          className="w-full pl-9 pr-3 h-11 glass-input text-sm"
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="glass-table w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                <th className="px-6 py-3 font-medium">Data</th>
                <th className="px-6 py-3 font-medium">Azione</th>
                <th className="px-6 py-3 font-medium">Su chi</th>
                <th className="px-6 py-3 font-medium">Dettagli</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-[var(--glass-edge)]">
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(e.createdAt)}
                  </td>
                  <td className="px-6 py-3 text-gray-900 dark:text-white font-medium whitespace-nowrap">
                    {ACTION_LABELS[e.actionType] ?? e.actionType}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {e.targetCode !== null
                      ? `${formatActivityCode(e.targetCode)} ${e.targetName ?? ""}`
                      : "—"}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{formatDetails(e.details)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {entries.length === 0 ? "Nessuna azione registrata ancora." : "Nessun risultato."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
