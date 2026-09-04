"use client";

import { useMemo, useState } from "react";
import { Tag } from "lucide-react";
import { TaskItem } from "./task-item";
import { CompletedTasksList } from "./completed-tasks-list";
import { CONTACT_STATUSES, CONTACT_STATUS_LABEL, type Contact, type Task } from "@/lib/crm";

type LabelFilter = "tutte" | "nessuna" | Contact["status"];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AgendaExplorer({ tasks, contacts }: { tasks: Task[]; contacts: Contact[] }) {
  const [labelFilter, setLabelFilter] = useState<LabelFilter>("tutte");

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const filteredTasks = useMemo(() => {
    if (labelFilter === "tutte") return tasks;
    return tasks.filter((t) => {
      const contact = t.contact_id ? contactById.get(t.contact_id) : undefined;
      if (labelFilter === "nessuna") return !contact;
      return contact?.status === labelFilter;
    });
  }, [tasks, labelFilter, contactById]);

  const { activeSections, doneTasks } = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekAhead = new Date(today);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const overdue = filteredTasks.filter((t) => !t.done && new Date(t.due_at) < today);
    const todayTasks = filteredTasks.filter(
      (t) => !t.done && new Date(t.due_at) >= today && new Date(t.due_at) < tomorrow,
    );
    const upcoming = filteredTasks.filter(
      (t) => !t.done && new Date(t.due_at) >= tomorrow && new Date(t.due_at) < weekAhead,
    );
    const later = filteredTasks.filter((t) => !t.done && new Date(t.due_at) >= weekAhead);
    const done = filteredTasks
      .filter((t) => t.done)
      .sort((a, b) => new Date(b.due_at).getTime() - new Date(a.due_at).getTime());

    return {
      activeSections: [
        { title: "Scadute", items: overdue },
        { title: "Oggi", items: todayTasks, emptyLabel: "Nessuna attività per oggi." },
        { title: "Prossimi 7 giorni", items: upcoming },
        { title: "Più avanti", items: later },
      ] as { title: string; items: Task[]; emptyLabel?: string }[],
      doneTasks: done,
    };
  }, [filteredTasks]);

  const noResultsForFilter = labelFilter !== "tutte" && filteredTasks.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Tag size={15} className="text-gray-500 dark:text-gray-400 shrink-0" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Stato contatto:</span>
        <select
          value={labelFilter}
          onChange={(e) => setLabelFilter(e.target.value as LabelFilter)}
          className="h-10 glass-input px-3 text-sm"
        >
          <option value="tutte">Tutti gli stati</option>
          {CONTACT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CONTACT_STATUS_LABEL[s]}
            </option>
          ))}
          <option value="nessuna">Senza contatto</option>
        </select>
      </div>

      {noResultsForFilter ? (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">Nessuna attività con questo stato contatto.</p>
        </div>
      ) : (
        <>
          {activeSections.map(
            (section) =>
              (section.items.length > 0 || section.emptyLabel) && (
                <div
                  key={section.title}
                  className="glass-card overflow-hidden"
                >
                  <div className="px-6 py-3 border-b border-gray-200 dark:border-white/10">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {section.title}
                      <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                        {section.items.length}
                      </span>
                    </h2>
                  </div>
                  {section.items.length === 0 ? (
                    <p className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {section.emptyLabel}
                    </p>
                  ) : (
                    <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5">
                      {section.items.map((t) => {
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
                    </div>
                  )}
                </div>
              ),
          )}

          {doneTasks.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-3 border-b border-gray-200 dark:border-white/10">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Completate
                  <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                    {doneTasks.length}
                  </span>
                </h2>
              </div>
              <CompletedTasksList tasks={doneTasks} contacts={contacts} formatTime={formatTime} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
