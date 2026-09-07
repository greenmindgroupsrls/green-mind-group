"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { messaggioErrore } from "@/i18n/errori";
import { getDizionario } from "@/i18n/dizionario";

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

  if (error) return { error: messaggioErrore(error, await getDizionario()), success: false };

  revalidatePath("/");
  return { error: null, success: true };
}
