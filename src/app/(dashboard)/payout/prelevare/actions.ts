"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import { formatActivityCode } from "@/lib/activity-code";
import { sendWithdrawalStatusEmail, sendNewWithdrawalRequestNotification } from "@/lib/email";
import type { WithdrawalRequest, WithdrawalStatus } from "@/lib/withdrawals";
import { validaIban, validaBic, validaCoerenza } from "@/lib/bank-validation";

export type WithdrawalState = {
  error: string | null;
  success: boolean;
};

export async function requestWithdrawal(
  _prevState: WithdrawalState,
  formData: FormData,
): Promise<WithdrawalState> {
  const amount = Number(String(formData.get("amount") ?? "").trim());
  const bankName = String(formData.get("bank_name") ?? "").trim();
  const iban = String(formData.get("iban") ?? "").trim();
  const accountType = String(formData.get("account_type") ?? "").trim();
  const swiftCode = String(formData.get("swift_code") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Importo non valido", success: false };
  }
  if (!bankName) return { error: "Nome banca e indirizzo obbligatori", success: false };
  if (!iban) return { error: "IBAN obbligatorio", success: false };

  // Il controllo nel browser e' aggirabile: qui si parla di un bonifico
  // reale, quindi si ricontrolla prima di registrare la richiesta.
  const esitoIban = validaIban(iban);
  if (!esitoIban.ok) return { error: `IBAN non valido — ${esitoIban.errore}`, success: false };
  const esitoSwift = validaBic(swiftCode);
  if (!esitoSwift.ok) return { error: `Swift non valido — ${esitoSwift.errore}`, success: false };
  const esitoCoerenza = validaCoerenza(iban, swiftCode);
  if (!esitoCoerenza.ok) return { error: esitoCoerenza.errore, success: false };

  const member = await getCurrentMember();

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_withdrawal_request", {
    p_amount: amount,
    p_bank_name: bankName,
    p_iban: iban,
    p_account_type: accountType || null,
    p_swift_code: swiftCode || null,
  });

  if (error) return { error: error.message, success: false };

  if (member && member.activity_code !== 0) {
    const { data: root } = await supabase.from("members").select("email").eq("activity_code", 0).single();
    if (root?.email) {
      await sendNewWithdrawalRequestNotification({
        to: root.email,
        memberName: member.username,
        memberCode: formatActivityCode(member.activity_code),
        amount,
      });
    }
  }

  revalidatePath("/payout/prelevare");
  return { error: null, success: true };
}

export async function setWithdrawalStatus(id: number, status: WithdrawalStatus) {
  const supabase = await createClient();
  const { data: requestRaw } = await supabase
    .rpc("update_withdrawal_status", { p_id: id, p_status: status })
    .single();
  const request = requestRaw as WithdrawalRequest | null;

  // Il chiamante e' l'azienda (root), che vede tutti i members via RLS:
  // nessun bisogno del client admin qui.
  if (request) {
    const { data: member } = await supabase
      .from("members")
      .select("email")
      .eq("activity_code", request.activity_code)
      .maybeSingle();

    if (member?.email) {
      await sendWithdrawalStatusEmail({ to: member.email, amount: request.net_amount, status });
    }
  }

  revalidatePath("/payout/prelevare");
}
