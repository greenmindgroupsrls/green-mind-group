"use server";

import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BecomeIncaricatoState = {
  error: string | null;
};

export async function becomeIncaricato(
  _prevState: BecomeIncaricatoState,
  formData: FormData,
): Promise<BecomeIncaricatoState> {
  const accepted = formData.get("regolamento") === "on";
  if (!accepted) {
    return { error: "Devi accettare il Regolamento Incaricati per continuare" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("become_incaricato").single();

  if (error) {
    return { error: error.message };
  }

  revalidateTag("network-data", { expire: 0 });
  redirect("/");
}
