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
