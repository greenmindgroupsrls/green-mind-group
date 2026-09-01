"use client";

import { useState } from "react";
import { ControlCenterExplorer, type ControlCenterMember } from "./control-center-explorer";
import { AuditLogView, type AuditLogRow } from "./audit-log-view";
import { ExportDataView } from "./export-data-view";
import { CompensationSettingsView, type CompensationSettings } from "./compensation-settings-view";

type Tab = "membri" | "registro" | "esportazioni" | "compensi";

const TABS: { id: Tab; label: string }[] = [
  { id: "membri", label: "Membri" },
  { id: "registro", label: "Registro azioni" },
  { id: "esportazioni", label: "Esportazioni" },
  { id: "compensi", label: "Piano compensi" },
];

export function ControlCenterTabs({
  members,
  auditLog,
  compensationSettings,
}: {
  members: ControlCenterMember[];
  auditLog: AuditLogRow[];
  compensationSettings: CompensationSettings;
}) {
  const [tab, setTab] = useState<Tab>("membri");

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-white/10">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0 ${
              tab === id
                ? "border-accent text-accent"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "membri" && <ControlCenterExplorer members={members} />}
      {tab === "registro" && <AuditLogView entries={auditLog} />}
      {tab === "esportazioni" && <ExportDataView />}
      {tab === "compensi" && <CompensationSettingsView settings={compensationSettings} />}
    </div>
  );
}
