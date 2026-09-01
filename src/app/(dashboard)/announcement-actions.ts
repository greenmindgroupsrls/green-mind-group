"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AnnouncementState = {
  error: string | null;
  success: boolean;
};

export async function postAnnouncement(
  _prevState: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title) return { error: "Titolo obbligatorio", success: false };
  if (!body) return { error: "Testo obbligatorio", success: false };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_announcement", { p_title: title, p_body: body });

  if (error) return { error: error.message, success: false };

  revalidatePath("/");
  return { error: null, success: true };
}
