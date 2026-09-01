export type ContactStatus = "da_chiamare" | "niente" | "appuntamento" | "richiamare";

export type Contact = {
  id: number;
  owner_code: number;
  name: string;
  phone: string | null;
  email: string | null;
  status: ContactStatus;
  notes: string | null;
  linked_member_code: number | null;
  created_at: string;
  updated_at: string;
};

export type TaskKind = "task" | "appuntamento";
export type TaskRecurrence = "none" | "daily" | "weekly" | "monthly";

export type Task = {
  id: number;
  owner_code: number;
  contact_id: number | null;
  title: string;
  due_at: string;
  done: boolean;
  kind: TaskKind;
  notes: string | null;
  recurrence: TaskRecurrence;
  created_at: string;
};

export const CONTACT_STATUSES: ContactStatus[] = ["da_chiamare", "niente", "appuntamento", "richiamare"];

export const CONTACT_STATUS_LABEL: Record<ContactStatus, string> = {
  da_chiamare: "Da chiamare",
  niente: "Niente",
  appuntamento: "Appuntamento",
  richiamare: "Richiamare",
};

export const CONTACT_STATUS_BADGE_CLASS: Record<ContactStatus, string> = {
  da_chiamare: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  niente: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  appuntamento: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  richiamare: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

// Lo stato "Appuntamento" non è mai una scelta salvata a mano: è vero se e
// solo se esiste un'attività di tipo "appuntamento" ancora aperta (non
// completata) collegata al contatto — calcolato al volo qui, non scritto
// nella colonna status. Cancellando o completando l'attività, il contatto
// torna automaticamente al suo stato "manuale" (quello scelto dall'utente
// o l'ultimo salvato prima dell'appuntamento), senza bisogno di codice che
// tenga i due sincronizzati a mano.
export function withEffectiveStatus(contacts: Contact[], tasks: Task[]): Contact[] {
  const openAppointmentContactIds = new Set(
    tasks
      .filter((t) => t.kind === "appuntamento" && !t.done && t.contact_id !== null)
      .map((t) => t.contact_id as number),
  );
  return contacts.map((c) =>
    openAppointmentContactIds.has(c.id) ? { ...c, status: "appuntamento" as ContactStatus } : c,
  );
}

export const TASK_RECURRENCES: TaskRecurrence[] = ["none", "daily", "weekly", "monthly"];

export const TASK_RECURRENCE_LABEL: Record<TaskRecurrence, string> = {
  none: "Non si ripete",
  daily: "Ogni giorno",
  weekly: "Ogni settimana",
  monthly: "Ogni mese",
};
