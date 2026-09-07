"use client";

import { useState } from "react";
import { TabBar, TabButton } from "@/components/tab-bar";
import { ControlCenterExplorer, type ControlCenterMember } from "./control-center-explorer";
import { AuditLogView, type AuditLogRow } from "./audit-log-view";
import { ExportDataView } from "./export-data-view";
import { CompensationSettingsView, type CompensationSettings } from "./compensation-settings-view";
import { RoyalPoolView, type RoyalPoolInfo } from "./royal-pool-view";

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
  royalPool,
}: {
  members: ControlCenterMember[];
  auditLog: AuditLogRow[];
  compensationSettings: CompensationSettings;
  royalPool: RoyalPoolInfo;
}) {
  const [tab, setTab] = useState<Tab>("membri");

  return (
    <div className="flex flex-col gap-6">
      <TabBar>
        {TABS.map(({ id, label }) => (
          <TabButton key={id} attiva={tab === id} onClick={() => setTab(id)}>
            {label}
          </TabButton>
        ))}
      </TabBar>

      {tab === "membri" && <ControlCenterExplorer members={members} />}
      {tab === "registro" && <AuditLogView entries={auditLog} />}
      {tab === "esportazioni" && <ExportDataView />}
      {tab === "compensi" && (
        <div className="flex flex-col gap-6">
          <CompensationSettingsView settings={compensationSettings} />
          <RoyalPoolView info={royalPool} />
        </div>
      )}
    </div>
  );
}
