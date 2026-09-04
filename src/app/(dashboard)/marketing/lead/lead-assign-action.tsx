"use client";

import { useState, useTransition } from "react";
import { assignLead } from "./actions";

type MemberOption = { activity_code: number; username: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export function LeadAssignAction({
  id,
  members,
  assignedToUsername,
  assignedAt,
}: {
  id: number;
  members: MemberOption[];
  assignedToUsername: string | null;
  assignedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [justAssigned, setJustAssigned] = useState<string | null>(null);

  function handleAssign() {
    if (!selected) return;
    setError(null);
    const memberCode = Number(selected);
    const username = members.find((m) => m.activity_code === memberCode)?.username ?? null;
    startTransition(async () => {
      try {
        await assignLead(id, memberCode);
        setJustAssigned(username);
        setSelected("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore imprevisto");
      }
    });
  }

  const currentAssignee = justAssigned ?? assignedToUsername;

  return (
    <div className="flex flex-col gap-1.5 min-w-[170px]">
      {currentAssignee && (
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Inoltrato a <span className="font-medium">{currentAssignee}</span>
          {assignedAt && !justAssigned && (
            <span className="text-gray-500 dark:text-gray-400"> il {formatDate(assignedAt)}</span>
          )}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={pending}
          className="text-xs glass-input rounded-md text-gray-700 dark:text-gray-300 px-1.5 py-1 disabled:opacity-50 flex-1 min-w-0"
        >
          <option value="">{currentAssignee ? "Inoltra ad un altro…" : "Scegli membro…"}</option>
          {members.map((m) => (
            <option key={m.activity_code} value={m.activity_code}>
              {m.username}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAssign}
          disabled={pending || !selected}
          className="text-[11px] text-accent hover:underline disabled:opacity-50 shrink-0"
        >
          Inoltra
        </button>
      </div>
      {error && <span className="text-[11px] text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
