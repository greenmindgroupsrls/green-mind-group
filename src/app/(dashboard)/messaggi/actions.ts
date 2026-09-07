"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseActivityCode } from "@/lib/activity-code";
import { messaggioErrore } from "@/i18n/errori";
import { getDizionario } from "@/i18n/dizionario";

export type SendMessageState = {
  error: string | null;
  success: boolean;
};

export async function sendMessage(
  _prevState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const recipient = String(formData.get("recipient") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!recipient) return { error: "Destinatario obbligatorio", success: false };
  if (!subject) return { error: "Oggetto obbligatorio", success: false };
  if (!body) return { error: "Messaggio obbligatorio", success: false };

  // "V00012" -> codice numerico per la risoluzione lato DB; se non e' un
  // codice valido si assume sia uno username e si lascia invariato.
  const parsedCode = parseActivityCode(recipient);
  const resolvedRecipient = parsedCode !== null ? String(parsedCode) : recipient;

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_message", {
    p_recipient: resolvedRecipient,
    p_subject: subject,
    p_body: body,
  });

  if (error) {
    return { error: messaggioErrore(error, await getDizionario()), success: false };
  }

  revalidatePath("/messaggi");
  return { error: null, success: true };
}
