"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import type { ContactStatus, TaskKind, TaskRecurrence } from "@/lib/crm";

function nextDueAt(dueAt: string, recurrence: TaskRecurrence): string | null {
  const d = new Date(dueAt);
  if (recurrence === "daily") d.setDate(d.getDate() + 1);
  else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
  else if (recurrence === "monthly") d.setMonth(d.getMonth() + 1);
  else return null;
  return d.toISOString();
}

export type TaskState = { error: string | null; success: boolean };

export async function createTask(_prevState: TaskState, formData: FormData): Promise<TaskState> {
  const title = String(formData.get("title") ?? "").trim();
  const dueAt = String(formData.get("due_at") ?? "").trim();
  const contactIdRaw = String(formData.get("contact_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const recurrence = String(formData.get("recurrence") ?? "none").trim() as TaskRecurrence;

  if (!title) return { error: "Titolo obbligatorio", success: false };
  if (!dueAt) return { error: "Data/ora obbligatoria", success: false };

  const member = await getCurrentMember();
  if (!member) return { error: "Devi essere autenticato", success: false };

  const supabase = await createClient();
  const { error } = await supabase.from("crm_tasks").insert({
    owner_code: member.activity_code,
    title,
    due_at: new Date(dueAt).toISOString(),
    contact_id: contactIdRaw ? Number(contactIdRaw) : null,
    notes: notes || null,
    recurrence,
  });

  if (error) return { error: error.message, success: false };

  revalidatePath("/agenda");
  return { error: null, success: true };
}

export async function updateTask(_prevState: TaskState, formData: FormData): Promise<TaskState> {
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const dueAt = String(formData.get("due_at") ?? "").trim();
  const contactIdRaw = String(formData.get("contact_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const recurrence = String(formData.get("recurrence") ?? "none").trim() as TaskRecurrence;

  if (!id) return { error: "Attività non valida", success: false };
  if (!title) return { error: "Titolo obbligatorio", success: false };
  if (!dueAt) return { error: "Data/ora obbligatoria", success: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_tasks")
    .update({
      title,
      due_at: new Date(dueAt).toISOString(),
      contact_id: contactIdRaw ? Number(contactIdRaw) : null,
      notes: notes || null,
      recurrence,
    })
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/agenda");
  return { error: null, success: true };
}

export async function toggleTaskDone(id: number, done: boolean) {
  const supabase = await createClient();

  if (done) {
    const { data: task } = await supabase
      .from("crm_tasks")
      .select("owner_code, contact_id, title, due_at, kind, notes, recurrence")
      .eq("id", id)
      .single();

    if (task && task.recurrence !== "none") {
      const due = nextDueAt(task.due_at, task.recurrence as TaskRecurrence);
      if (due) {
        await supabase.from("crm_tasks").insert({
          owner_code: task.owner_code,
          contact_id: task.contact_id,
          title: task.title,
          due_at: due,
          kind: task.kind,
          notes: task.notes,
          recurrence: task.recurrence,
        });
      }
    }
  }

  await supabase.from("crm_tasks").update({ done }).eq("id", id);
  revalidatePath("/agenda");
}

export async function deleteTask(id: number) {
  const supabase = await createClient();
  await supabase.from("crm_tasks").delete().eq("id", id);
  revalidatePath("/agenda");
}

export type AppointmentState = { error: string | null; success: boolean };

export async function createAppointment(
  _prevState: AppointmentState,
  formData: FormData,
): Promise<AppointmentState> {
  const contactId = Number(formData.get("contact_id"));
  const dueAt = String(formData.get("due_at") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!contactId) return { error: "Contatto non valido", success: false };
  if (!dueAt) return { error: "Data/ora obbligatoria", success: false };

  const member = await getCurrentMember();
  if (!member) return { error: "Devi essere autenticato", success: false };

  const supabase = await createClient();
  const { data: contact } = await supabase
    .from("crm_contacts")
    .select("name")
    .eq("id", contactId)
    .single();

  const { error } = await supabase.from("crm_tasks").insert({
    owner_code: member.activity_code,
    contact_id: contactId,
    title: `Appuntamento con ${contact?.name ?? "contatto"}`,
    due_at: new Date(dueAt).toISOString(),
    kind: "appuntamento" satisfies TaskKind,
    notes: notes || null,
  });

  if (error) return { error: error.message, success: false };

  // Lo stato "Appuntamento" del contatto non si scrive più qui: è derivato
  // al volo dall'esistenza di questa attività ancora aperta (vedi
  // crm.ts:withEffectiveStatus). Così, cancellando o completando
  // l'attività, il contatto torna automaticamente al suo stato precedente
  // senza bisogno di tenerlo sincronizzato a mano in due posti.
  revalidatePath("/agenda");
  revalidatePath("/agenda/contatti");
  return { error: null, success: true };
}

export type ContactState = { error: string | null; success: boolean };

export async function createContact(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) return { error: "Nome obbligatorio", success: false };

  const member = await getCurrentMember();
  if (!member) return { error: "Devi essere autenticato", success: false };

  const supabase = await createClient();
  const { error } = await supabase.from("crm_contacts").insert({
    owner_code: member.activity_code,
    name,
    phone: phone || null,
    email: email || null,
    notes: notes || null,
  });

  if (error) return { error: error.message, success: false };

  revalidatePath("/agenda/contatti");
  return { error: null, success: true };
}

export async function updateContact(_prevState: ContactState, formData: FormData): Promise<ContactState> {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const linkedMemberRaw = String(formData.get("linked_member_code") ?? "").trim();

  if (!id) return { error: "Contatto non valido", success: false };
  if (!name) return { error: "Nome obbligatorio", success: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_contacts")
    .update({
      name,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      linked_member_code: linkedMemberRaw ? Number(linkedMemberRaw) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/agenda/contatti");
  revalidatePath("/agenda");
  return { error: null, success: true };
}

export async function updateContactStatus(id: number, status: ContactStatus) {
  const supabase = await createClient();
  await supabase
    .from("crm_contacts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/agenda/contatti");
}

export async function deleteContact(id: number) {
  const supabase = await createClient();
  await supabase.from("crm_contacts").delete().eq("id", id);
  revalidatePath("/agenda/contatti");
  revalidatePath("/agenda");
}
