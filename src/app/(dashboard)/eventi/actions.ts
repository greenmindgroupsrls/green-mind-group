"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import type { InviteType, GuestStatus } from "@/lib/events";

async function requireRoot() {
  const member = await getCurrentMember();
  if (!member || member.activity_code !== 0) {
    throw new Error("Non autorizzato");
  }
}

export type EventState = { error: string | null; success: boolean };

function readEventFields(formData: FormData) {
  return {
    p_city: String(formData.get("city") ?? "").trim(),
    p_venue: String(formData.get("venue") ?? "").trim() || null,
    p_address: String(formData.get("address") ?? "").trim() || null,
    p_event_date: String(formData.get("event_date") ?? "").trim() || null,
    p_registration_time: String(formData.get("registration_time") ?? "").trim() || null,
    p_start_time: String(formData.get("start_time") ?? "").trim() || null,
    p_notes: String(formData.get("notes") ?? "").trim() || null,
    p_director_name: String(formData.get("director_name") ?? "").trim() || null,
    p_photo_url: String(formData.get("photo_url") ?? "").trim() || null,
  };
}

export async function createEvent(_prevState: EventState, formData: FormData): Promise<EventState> {
  try {
    await requireRoot();
  } catch {
    return { error: "Non autorizzato", success: false };
  }

  const fields = readEventFields(formData);
  if (!fields.p_city) return { error: "Città obbligatoria", success: false };
  if (!fields.p_event_date) return { error: "Data obbligatoria", success: false };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_event", fields);

  if (error) return { error: error.message, success: false };

  revalidatePath("/eventi");
  return { error: null, success: true };
}

export async function updateEvent(_prevState: EventState, formData: FormData): Promise<EventState> {
  try {
    await requireRoot();
  } catch {
    return { error: "Non autorizzato", success: false };
  }

  const id = Number(formData.get("id"));
  if (!id) return { error: "Evento non valido", success: false };

  const fields = readEventFields(formData);
  if (!fields.p_city) return { error: "Città obbligatoria", success: false };
  if (!fields.p_event_date) return { error: "Data obbligatoria", success: false };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_event", { p_id: id, ...fields });

  if (error) return { error: error.message, success: false };

  revalidatePath("/eventi");
  return { error: null, success: true };
}

export async function deleteEvent(id: number) {
  await requireRoot();
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_event", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/eventi");
}

export type GuestState = { error: string | null; success: boolean };

export async function inviteGuest(_prevState: GuestState, formData: FormData): Promise<GuestState> {
  const member = await getCurrentMember();
  if (!member) return { error: "Devi essere autenticato", success: false };

  const inviteType = String(formData.get("invite_type") ?? "") as InviteType;
  const eventIdRaw = String(formData.get("event_id") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const gdprConsent = formData.get("gdpr_consent") === "on";

  if (!["live", "zoom"].includes(inviteType)) {
    return { error: "Tipo evento non valido", success: false };
  }
  if (inviteType === "live" && !eventIdRaw) {
    return { error: "Seleziona l'evento Live", success: false };
  }
  if (!firstName || !lastName) return { error: "Nome e cognome obbligatori", success: false };
  if (!phone) return { error: "Telefono obbligatorio", success: false };
  if (!email) return { error: "Email obbligatoria", success: false };
  if (!gdprConsent) return { error: "Il consenso GDPR è obbligatorio", success: false };

  const supabase = await createClient();
  const { error } = await supabase.from("event_guests").insert({
    event_id: inviteType === "live" ? Number(eventIdRaw) : null,
    inviter_code: member.activity_code,
    invite_type: inviteType,
    first_name: firstName,
    last_name: lastName,
    phone,
    email,
    gdpr_consent: true,
    consented_at: new Date().toISOString(),
  });

  if (error) return { error: error.message, success: false };

  revalidatePath("/eventi");
  revalidatePath("/marketing/eventi");
  return { error: null, success: true };
}

export async function updateGuest(_prevState: GuestState, formData: FormData): Promise<GuestState> {
  const id = Number(formData.get("id"));
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!id) return { error: "Ospite non valido", success: false };
  if (!firstName || !lastName) return { error: "Nome e cognome obbligatori", success: false };
  if (!phone) return { error: "Telefono obbligatorio", success: false };
  if (!email) return { error: "Email obbligatoria", success: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_guests")
    .update({ first_name: firstName, last_name: lastName, phone, email })
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/eventi");
  return { error: null, success: true };
}

export async function updateGuestStatus(id: number, status: GuestStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_guests").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/eventi");
}

export async function deleteGuest(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_guests").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/eventi");
}
