"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import { formatActivityCode } from "@/lib/activity-code";
import { sendTicketConfirmationEmail, sendNewSupportTicketNotification } from "@/lib/email";

export type SupportTicketState = {
  error: string | null;
  success: { id: number; topic: string } | null;
};

export async function createSupportTicket(
  _prevState: SupportTicketState,
  formData: FormData,
): Promise<SupportTicketState> {
  const topic = String(formData.get("topic") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!topic) return { error: "Seleziona un argomento", success: null };
  if (!message) return { error: "Scrivi un messaggio", success: null };

  const member = await getCurrentMember();
  if (!member) return { error: "Devi essere autenticato per aprire un ticket", success: null };

  const supabase = await createClient();
  const { data: ticket, error } = await supabase
    .rpc("create_support_ticket", { p_topic: topic, p_message: message })
    .single();

  if (error || !ticket) {
    return { error: error?.message ?? "Errore nell'apertura del ticket", success: null };
  }

  const ticketRow = ticket as { id: number; topic: string };

  const { data: memberRow } = await supabase
    .from("members")
    .select("email")
    .eq("activity_code", member.activity_code)
    .single();

  if (memberRow?.email) {
    await sendTicketConfirmationEmail({
      to: memberRow.email,
      ticketId: ticketRow.id,
      topic: ticketRow.topic,
      message,
    });
  }

  if (member.activity_code !== 0) {
    const { data: root } = await supabase.from("members").select("email").eq("activity_code", 0).single();
    if (root?.email) {
      await sendNewSupportTicketNotification({
        to: root.email,
        memberName: member.username,
        memberCode: formatActivityCode(member.activity_code),
        ticketId: ticketRow.id,
        topic: ticketRow.topic,
      });
    }
  }

  return { error: null, success: { id: ticketRow.id, topic: ticketRow.topic } };
}
