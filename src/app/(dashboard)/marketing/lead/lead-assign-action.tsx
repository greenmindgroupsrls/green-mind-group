"use client";

import { useState, useTransition } from "react";
import { assignLead, unassignLead } from "./actions";
import { MemberPicker, type MemberOption } from "./member-picker";

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
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justAssigned, setJustAssigned] = useState<string | null>(null);
  const [liberato, setLiberato] = useState(false);

  function handleAssign() {
    if (selected === null) return;
    setError(null);
    const username = members.find((m) => m.activity_code === selected)?.username ?? null;
    startTransition(async () => {
      try {
        await assignLead(id, selected);
        setJustAssigned(username);
        setLiberato(false);
        setSelected(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore imprevisto");
      }
    });
  }

  function handleUnassign() {
    setError(null);
    startTransition(async () => {
      try {
        await unassignLead(id);
        setJustAssigned(null);
        setLiberato(true);
        setSelected(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore imprevisto");
      }
    });
  }

  // Dopo aver liberato, la riga mostrata dal server e' ancora quella vecchia
  // finche' la pagina non si aggiorna: senza questo, l'assegnatario appena
  // tolto resterebbe scritto sotto gli occhi di chi l'ha appena tolto.
  const currentAssignee = liberato ? null : (justAssigned ?? assignedToUsername);

  return (
    <div className="flex flex-col gap-1.5 w-[118px]">
      {currentAssignee && (
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Inoltrato a <span className="font-medium">{currentAssignee}</span>
          {assignedAt && !justAssigned && (
            <span className="text-gray-500 dark:text-gray-400"> il {formatDate(assignedAt)}</span>
          )}
          <button
            type="button"
            onClick={handleUnassign}
            disabled={pending}
            className="ml-1.5 text-[11px] text-gray-500 dark:text-gray-400 hover:underline disabled:opacity-50"
          >
            togli
          </button>
        </p>
      )}
      <div className="flex flex-col items-start gap-1">
        <MemberPicker
          members={members}
          value={selected}
          onChange={setSelected}
          disabled={pending}
          placeholder={currentAssignee ? "Cerca un altro membro…" : "Cerca membro…"}
        />
        <button
          type="button"
          onClick={handleAssign}
          disabled={pending || selected === null}
          className="text-[11px] text-accent hover:underline disabled:opacity-50 shrink-0"
        >
          Inoltra
        </button>
      </div>
      {error && <span className="text-[11px] text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
