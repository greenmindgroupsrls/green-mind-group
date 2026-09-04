"use client";

import { useActionState, useState } from "react";
import { Trash2, Pencil, CalendarPlus, Link2 } from "lucide-react";
import {
  updateContactStatus,
  deleteContact,
  updateContact,
  createAppointment,
  type ContactState,
  type AppointmentState,
} from "../actions";
import {
  CONTACT_STATUSES,
  CONTACT_STATUS_LABEL,
  CONTACT_STATUS_BADGE_CLASS,
  type Contact,
  type ContactStatus,
} from "@/lib/crm";
import { formatActivityCode } from "@/lib/activity-code";

const contactInitialState: ContactState = { error: null, success: false };
const appointmentInitialState: AppointmentState = { error: null, success: false };

const inputClass =
  "h-10 glass-input px-3 text-sm";
const labelClass = "text-xs font-medium text-gray-700 dark:text-gray-300";

// "Appuntamento" non è mai una scelta manuale da questo select: è uno stato
// derivato (vedi crm.ts:withEffectiveStatus) che compare da solo quando
// c'è un'attività aperta collegata, fissata col bottone qui sotto.
const MANUAL_STATUSES: ContactStatus[] = CONTACT_STATUSES.filter((s) => s !== "appuntamento");

function defaultDueAt() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function ContactCard({
  contact,
  members,
}: {
  contact: Contact;
  members: { activity_code: number; username: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [schedulingAppt, setSchedulingAppt] = useState(false);
  const [editState, editAction, editPending] = useActionState(updateContact, contactInitialState);
  const [apptState, apptAction, apptPending] = useActionState(createAppointment, appointmentInitialState);

  const linkedMember = contact.linked_member_code
    ? members.find((m) => m.activity_code === contact.linked_member_code)
    : undefined;

  const statusOptions = MANUAL_STATUSES.includes(contact.status)
    ? MANUAL_STATUSES
    : [contact.status, ...MANUAL_STATUSES];

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await editAction(formData);
          setEditing(false);
        }}
        className="flex flex-col gap-3 px-4 py-4 bg-gray-50 dark:bg-white/5"
      >
        <input type="hidden" name="id" value={contact.id} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Nome *</span>
            <input name="name" defaultValue={contact.name} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Telefono</span>
            <input name="phone" defaultValue={contact.phone ?? ""} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Email</span>
            <input name="email" type="email" defaultValue={contact.email ?? ""} className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Note</span>
          <textarea
            name="notes"
            defaultValue={contact.notes ?? ""}
            rows={2}
            className={`${inputClass} h-auto py-2 resize-none`}
          />
        </label>
        {members.length > 0 && (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Collegato a un iscritto</span>
            <select
              name="linked_member_code"
              defaultValue={contact.linked_member_code ?? ""}
              className={inputClass}
            >
              <option value="">Nessuno</option>
              {members.map((m) => (
                <option key={m.activity_code} value={m.activity_code}>
                  {formatActivityCode(m.activity_code)} {m.username}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={editPending}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {editPending ? "Salvataggio..." : "Salva"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline"
          >
            Annulla
          </button>
          {editState.error && <p className="text-xs text-red-600 dark:text-red-400">{editState.error}</p>}
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{contact.name}</p>
          <div className="flex items-center gap-2 min-w-0 mt-0.5">
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {[contact.phone, contact.email, contact.notes].filter(Boolean).join(" · ") || "—"}
            </p>
            {linkedMember && (
              <span className="shrink-0 flex items-center gap-1 text-[11px] text-accent">
                <Link2 size={11} />
                <span className="text-gray-500 dark:text-gray-400">
                  {formatActivityCode(linkedMember.activity_code)}
                </span>{" "}
                {linkedMember.username}
              </span>
            )}
          </div>
        </div>

        <div className="w-36 shrink-0 flex justify-center">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${CONTACT_STATUS_BADGE_CLASS[contact.status]}`}
          >
            {CONTACT_STATUS_LABEL[contact.status]}
          </span>
        </div>

        <select
          value={contact.status}
          onChange={(e) => updateContactStatus(contact.id, e.target.value as Contact["status"])}
          className="h-9 glass-input px-2 text-xs shrink-0"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {CONTACT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setSchedulingAppt((v) => !v)}
          className="text-gray-300 hover:text-emerald-600 dark:text-gray-600 dark:hover:text-emerald-400 shrink-0"
          aria-label="Fissa appuntamento"
        >
          <CalendarPlus size={16} />
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-gray-300 hover:text-accent dark:text-gray-600 dark:hover:text-accent shrink-0"
          aria-label="Modifica contatto"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={() => deleteContact(contact.id)}
          className="text-gray-300 hover:text-red-600 dark:text-gray-600 dark:hover:text-red-400 shrink-0"
          aria-label="Elimina contatto"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {schedulingAppt && (
        <form
          action={async (formData) => {
            await apptAction(formData);
            setSchedulingAppt(false);
          }}
          className="flex flex-col sm:flex-row sm:items-end gap-2 rounded-lg border border-gray-200 dark:border-white/10 p-3"
        >
          <input type="hidden" name="contact_id" value={contact.id} />
          <label className="flex flex-col gap-1 flex-1">
            <span className={labelClass}>Data e ora appuntamento</span>
            <input
              name="due_at"
              type="datetime-local"
              required
              defaultValue={defaultDueAt()}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 flex-1">
            <span className={labelClass}>Note (opzionale)</span>
            <input name="notes" className={inputClass} />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={apptPending}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {apptPending ? "Salvataggio..." : "Fissa"}
            </button>
            <button
              type="button"
              onClick={() => setSchedulingAppt(false)}
              className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline"
            >
              Annulla
            </button>
          </div>
          {apptState.error && <p className="text-xs text-red-600 dark:text-red-400">{apptState.error}</p>}
        </form>
      )}
    </div>
  );
}
