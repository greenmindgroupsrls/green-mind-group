"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateLeadStatus(id: number, status: string, internalNotes: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_lead_status", {
    p_id: id,
    p_status: status,
    p_internal_notes: internalNotes,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/marketing/lead");
}

export async function assignLead(id: number, memberCode: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_assign_lead", {
    p_id: id,
    p_member_code: memberCode,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/marketing/lead");
}

// appointmentAt arriva dal browser come "2026-09-16T10:30" (ora locale di
// chi compila): va convertito in un istante assoluto, altrimenti il
// database lo interpreterebbe come UTC e l'appuntamento slitterebbe di
// un paio d'ore. null = appuntamento annullato.
export async function setLeadAppointment(id: number, appointmentAt: string | null) {
  let iso: string | null = null;
  if (appointmentAt) {
    const d = new Date(appointmentAt);
    if (Number.isNaN(d.getTime())) throw new Error("Data non valida");
    iso = d.toISOString();
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_lead_appointment", {
    p_id: id,
    p_appointment_at: iso,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/marketing/lead");
}

// La cancellazione e' definitiva: il controllo su chi puo' farla sta nel
// database, qui si passa solo la richiesta. Prima di sparire il lead finisce
// nel registro delle azioni, cosi' resta traccia di cosa e' stato tolto.
export async function deleteLead(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_lead", { p_lead_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/marketing/lead");
}
