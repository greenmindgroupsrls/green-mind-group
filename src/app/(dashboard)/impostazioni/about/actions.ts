"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AboutState = {
  error: string | null;
  success: boolean;
};

export async function updateAbout(
  _prevState: AboutState,
  formData: FormData,
): Promise<AboutState> {
  const about = String(formData.get("about") ?? "").trim();
  if (!about) return { error: "Il campo About è obbligatorio", success: false };

  const linkedin = String(formData.get("linkedin") ?? "").trim();
  const facebook = String(formData.get("facebook") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_own_profile", {
    p_about: about,
    p_linkedin_url: linkedin ? `https://linkedin.com/${linkedin}` : null,
    p_facebook_url: facebook ? `https://facebook.com/${facebook}` : null,
    p_instagram_url: instagram ? `https://instagram.com/${instagram}` : null,
  });

  if (error) return { error: error.message, success: false };

  revalidatePath("/impostazioni/about");
  return { error: null, success: true };
}
