"use client";

import { useMemo, useState } from "react";
import { TaskItem } from "./task-item";
import type { Contact, Task } from "@/lib/crm";

const PAGE_SIZE = 10;

export function CompletedTasksList({
  tasks,
  contacts,
  formatTime,
}: {
  tasks: Task[];
  contacts: Contact[];
  formatTime: (iso: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? tasks : tasks.slice(0, PAGE_SIZE);
  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  return (
    <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5">
      {visible.map((t) => {
        const contact = t.contact_id ? contactById.get(t.contact_id) : undefined;
        return (
          <TaskItem
            key={t.id}
            id={t.id}
            title={t.title}
            done={t.done}
            contactId={t.contact_id}
            contactName={contact?.name ?? null}
            contactStatus={contact?.status ?? null}
            dueAtIso={t.due_at}
            time={formatTime(t.due_at)}
            kind={t.kind}
            notes={t.notes}
            recurrence={t.recurrence}
            contacts={contacts}
          />
        );
      })}
      {tasks.length > PAGE_SIZE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="px-4 py-2.5 text-xs font-medium text-accent hover:underline text-left"
        >
          {expanded ? "Mostra solo le ultime 10" : `Mostra tutte (${tasks.length})`}
        </button>
      )}
    </div>
  );
}
