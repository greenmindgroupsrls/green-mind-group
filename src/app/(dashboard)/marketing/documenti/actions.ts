"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";

export async function setMarketingDocument(docType: string, fileUrl: string, fileName: string) {
  const member = await getCurrentMember();
  if (!member || member.activity_code !== 0) {
    throw new Error("Non autorizzato");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_marketing_document", {
    p_doc_type: docType,
    p_file_url: fileUrl,
    p_file_name: fileName,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/marketing/documenti");
}

export async function setBusinessCardTemplate(side: "front" | "back", fileUrl: string, fileName: string) {
  const member = await getCurrentMember();
  if (!member || member.activity_code !== 0) {
    throw new Error("Non autorizzato");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_business_card_template", {
    p_side: side,
    p_file_url: fileUrl,
    p_file_name: fileName,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/marketing/documenti");
}
