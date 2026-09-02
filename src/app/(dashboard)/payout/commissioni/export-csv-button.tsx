"use client";

import { Download } from "lucide-react";
import { formatActivityCode } from "@/lib/activity-code";
import type { CommissionRow } from "@/lib/payout-data";
import { etichettaProvvigione } from "@/lib/piano-compensi";

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function ExportCsvButton({ rows }: { rows: CommissionRow[] }) {
  function handleExport() {
    const header = ["Data", "Utente", "Codice", "Categoria", "Importo (EUR)"];
    const lines = rows.map((r) =>
      [
        new Date(r.createdAt).toLocaleDateString("it-IT"),
        r.sellerUsername,
        formatActivityCode(r.sellerCode),
        etichettaProvvigione(r.kind, r.level),
        r.amount.toFixed(2).replace(".", ","),
      ]
        .map(csvEscape)
        .join(";"),
    );
    const csv = [header.map(csvEscape).join(";"), ...lines].join("\n");

    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `estratto-conto-commissioni-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={rows.length === 0}
      className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
    >
      <Download size={16} />
      Esporta CSV
    </button>
  );
}
