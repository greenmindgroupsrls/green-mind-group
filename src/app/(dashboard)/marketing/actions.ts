"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setCallScript(id: number, label: string, body: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_call_script", {
    p_id: id,
    p_label: label,
    p_body: body,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/marketing");
}

export async function addCallScript(label: string, body: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_add_call_script", {
    p_label: label,
    p_body: body,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/marketing");
  return data as { id: number; label: string; body: string };
}
