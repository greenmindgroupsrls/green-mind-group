import { Resend } from "resend";
import { supportTopicLabel } from "./support-topics";
import { SHOP_ORDER_STATUS_LABEL, type ShopOrderStatus } from "./shop-orders";
import { WITHDRAWAL_STATUS_LABEL, type WithdrawalStatus } from "./withdrawals";

export const SITE_URL = "https://greenmindgroup.pro";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Shell HTML condiviso da tutte le email — layout a tabelle (compatibilità
// email client, niente flexbox/grid) coerente con il brand del back office:
// header scuro con monogramma verde, corpo con tipografia leggibile,
// bottone d'azione opzionale, footer discreto. `bodyHtml` è già HTML
// (i valori dinamici vanno passati già scappati con escapeHtml).
function renderEmailHtml(params: {
  heading: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
}) {
  const { heading, bodyHtml, cta } = params;

  return `<!doctype html>
<html lang="it">
  <body style="margin:0;padding:0;background-color:#f3f4f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(16,17,23,0.08);">
            <tr>
              <td style="background-color:#0e0b21;padding:24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:#5f9a0e;width:36px;height:36px;border-radius:9px;text-align:center;vertical-align:middle;">
                      <span style="display:inline-block;color:#ffffff;font-size:18px;font-weight:700;line-height:36px;">G</span>
                    </td>
                    <td style="padding-left:12px;color:#ffffff;font-size:16px;font-weight:600;">
                      Green Mind Group
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 12px 32px;">
                <h1 style="margin:0 0 16px 0;font-size:21px;line-height:1.3;color:#111318;font-weight:700;">
                  ${heading}
                </h1>
                <div style="font-size:15px;line-height:1.65;color:#42454f;">
                  ${bodyHtml}
                </div>
              </td>
            </tr>
            ${
              cta
                ? `<tr>
              <td style="padding:8px 32px 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:#5f9a0e;border-radius:10px;">
                      <a href="${cta.href}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                        ${escapeHtml(cta.label)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding:20px 32px 28px 32px;border-top:1px solid #edeef1;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#9a9da8;">
                  Green Mind Group · email automatica, non serve rispondere.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// L'invio email e' best-effort: se RESEND_API_KEY non e' ancora configurata
// (provider non collegato via Vercel Marketplace), l'azione che ha chiamato
// questa funzione resta comunque valida — semplicemente non parte la mail.
async function sendEmail(params: { to: string; subject: string; text: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "Green Mind Group <onboarding@resend.dev>";

  try {
    await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
  } catch {
    // non blocchiamo l'azione che ha generato l'email se l'invio fallisce
  }
}

export async function sendTicketConfirmationEmail(params: {
  to: string;
  ticketId: number;
  topic: string;
  message: string;
}) {
  const topicLabel = supportTopicLabel(params.topic);

  await sendEmail({
    to: params.to,
    subject: `Ticket #${params.ticketId} ricevuto — Green Mind Group`,
    text: [
      `Ciao,`,
      ``,
      `abbiamo ricevuto la tua richiesta di assistenza — numero ticket #${params.ticketId}.`,
      ``,
      `Argomento: ${topicLabel}`,
      `Messaggio:`,
      params.message,
      ``,
      `Verrai contattato dal nostro team entro 24 ore per risolvere il problema.`,
      ``,
      `Green Mind Group`,
    ].join("\n"),
    html: renderEmailHtml({
      heading: `Ticket #${params.ticketId} ricevuto`,
      bodyHtml: `
        <p style="margin:0 0 16px 0;">Ciao,</p>
        <p style="margin:0 0 20px 0;">Abbiamo ricevuto la tua richiesta di assistenza. Il nostro team ti risponderà entro 24 ore.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background-color:#f7f8fa;border-radius:10px;margin:0 0 4px 0;">
          <tr>
            <td style="padding:16px 18px;">
              <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.03em;color:#8f929c;">Argomento</p>
              <p style="margin:0 0 14px 0;color:#111318;">${escapeHtml(topicLabel)}</p>
              <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.03em;color:#8f929c;">Messaggio</p>
              <p style="margin:0;color:#111318;white-space:pre-wrap;">${escapeHtml(params.message)}</p>
            </td>
          </tr>
        </table>
      `,
      cta: { label: "Vai al ticket", href: `${SITE_URL}/support/ticket` },
    }),
  });
}

export async function sendNewReferralEmail(params: {
  to: string;
  sponsorName: string;
  newMemberName: string;
  newMemberCode: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `Nuovo iscritto nella tua rete — Green Mind Group`,
    text: [
      `Ciao ${params.sponsorName},`,
      ``,
      `${params.newMemberName} (${params.newMemberCode}) si è appena iscritto usando il tuo codice.`,
      ``,
      `Vai su Team, nel back office, per vedere la tua rete aggiornata.`,
      ``,
      `Green Mind Group`,
    ].join("\n"),
    html: renderEmailHtml({
      heading: "Un nuovo iscritto nella tua rete 🌱",
      bodyHtml: `
        <p style="margin:0 0 16px 0;">Ciao ${escapeHtml(params.sponsorName)},</p>
        <p style="margin:0 0 4px 0;">
          <strong style="color:#111318;">${escapeHtml(params.newMemberName)}</strong>
          <span style="color:#8f929c;"> (${escapeHtml(params.newMemberCode)})</span>
        </p>
        <p style="margin:0 0 20px 0;">si è appena iscritto usando il tuo codice personale.</p>
      `,
      cta: { label: "Vai al tuo Team", href: `${SITE_URL}/albero` },
    }),
  });
}

export async function sendOrderStatusEmail(params: {
  to: string;
  orderId: number;
  status: ShopOrderStatus;
}) {
  const statusLabel = SHOP_ORDER_STATUS_LABEL[params.status];

  await sendEmail({
    to: params.to,
    subject: `Ordine #${params.orderId}: ${statusLabel} — Green Mind Group`,
    text: [
      `Ciao,`,
      ``,
      `il tuo ordine #${params.orderId} è ora: ${statusLabel}.`,
      ``,
      `Vai su Shop → Ordini, nel back office, per i dettagli.`,
      ``,
      `Green Mind Group`,
    ].join("\n"),
    html: renderEmailHtml({
      heading: `Aggiornamento sul tuo ordine`,
      bodyHtml: `
        <p style="margin:0 0 16px 0;">Ciao,</p>
        <p style="margin:0 0 20px 0;">
          Il tuo ordine <strong style="color:#111318;">#${params.orderId}</strong> è ora:
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 4px 0;">
          <tr>
            <td style="background-color:#eef6e0;border-radius:999px;padding:8px 16px;">
              <span style="font-size:13px;font-weight:600;color:#5f9a0e;">${escapeHtml(statusLabel)}</span>
            </td>
          </tr>
        </table>
      `,
      cta: { label: "Vedi i tuoi ordini", href: `${SITE_URL}/shop/ordini` },
    }),
  });
}

export async function sendWithdrawalStatusEmail(params: {
  to: string;
  amount: number;
  status: WithdrawalStatus;
}) {
  const statusLabel = WITHDRAWAL_STATUS_LABEL[params.status];
  const amountLabel = params.amount.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

  await sendEmail({
    to: params.to,
    subject: `Prelievo ${amountLabel}: ${statusLabel} — Green Mind Group`,
    text: [
      `Ciao,`,
      ``,
      `la tua richiesta di prelievo da ${amountLabel} è ora: ${statusLabel}.`,
      ``,
      `Vai su Payout → Prelevare, nel back office, per i dettagli.`,
      ``,
      `Green Mind Group`,
    ].join("\n"),
    html: renderEmailHtml({
      heading: `Aggiornamento sul tuo prelievo`,
      bodyHtml: `
        <p style="margin:0 0 16px 0;">Ciao,</p>
        <p style="margin:0 0 20px 0;">
          La tua richiesta di prelievo da <strong style="color:#111318;">${escapeHtml(amountLabel)}</strong> è ora:
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 4px 0;">
          <tr>
            <td style="background-color:#eef6e0;border-radius:999px;padding:8px 16px;">
              <span style="font-size:13px;font-weight:600;color:#5f9a0e;">${escapeHtml(statusLabel)}</span>
            </td>
          </tr>
        </table>
      `,
      cta: { label: "Vai a Payout", href: `${SITE_URL}/payout/prelevare` },
    }),
  });
}

// Le 3 funzioni sotto notificano l'AZIENDA (non l'utente che ha generato
// l'evento) per i 3 eventi critici che richiedono la sua attenzione: nuova
// richiesta di prelievo, nuovo ticket di supporto, nuovo ordine shop.
// Stesso pattern best-effort delle altre email — se RESEND_API_KEY non è
// configurata, l'evento resta comunque registrato (notifica interna via
// Messaggi sempre presente, vedi notify_root() in Postgres).

export async function sendNewWithdrawalRequestNotification(params: {
  to: string;
  memberName: string;
  memberCode: string;
  amount: number;
}) {
  const amountLabel = params.amount.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

  await sendEmail({
    to: params.to,
    subject: `Nuova richiesta di prelievo (${amountLabel}) — Green Mind Group`,
    text: [
      `Ciao,`,
      ``,
      `${params.memberName} (${params.memberCode}) ha richiesto un prelievo di ${amountLabel}.`,
      ``,
      `Vai su Payout → Prelevare, nel back office, per gestirla.`,
      ``,
      `Green Mind Group`,
    ].join("\n"),
    html: renderEmailHtml({
      heading: "Nuova richiesta di prelievo",
      bodyHtml: `
        <p style="margin:0 0 4px 0;">
          <strong style="color:#111318;">${escapeHtml(params.memberName)}</strong>
          <span style="color:#8f929c;"> (${escapeHtml(params.memberCode)})</span>
        </p>
        <p style="margin:0 0 20px 0;">ha richiesto un prelievo di <strong style="color:#111318;">${escapeHtml(amountLabel)}</strong>.</p>
      `,
      cta: { label: "Gestisci richieste", href: `${SITE_URL}/payout/prelevare` },
    }),
  });
}

export async function sendNewSupportTicketNotification(params: {
  to: string;
  memberName: string;
  memberCode: string;
  ticketId: number;
  topic: string;
}) {
  const topicLabel = supportTopicLabel(params.topic);

  await sendEmail({
    to: params.to,
    subject: `Nuovo ticket #${params.ticketId} — Green Mind Group`,
    text: [
      `Ciao,`,
      ``,
      `${params.memberName} (${params.memberCode}) ha aperto il ticket #${params.ticketId}.`,
      ``,
      `Argomento: ${topicLabel}`,
      ``,
      `Green Mind Group`,
    ].join("\n"),
    html: renderEmailHtml({
      heading: `Nuovo ticket #${params.ticketId}`,
      bodyHtml: `
        <p style="margin:0 0 4px 0;">
          <strong style="color:#111318;">${escapeHtml(params.memberName)}</strong>
          <span style="color:#8f929c;"> (${escapeHtml(params.memberCode)})</span>
        </p>
        <p style="margin:0 0 20px 0;">ha aperto un ticket: <strong style="color:#111318;">${escapeHtml(topicLabel)}</strong>.</p>
      `,
    }),
  });
}

export async function sendNewShopOrderNotification(params: {
  to: string;
  memberName: string;
  memberCode: string;
  orderId: number;
  totalAmount: number;
}) {
  const amountLabel = params.totalAmount.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

  await sendEmail({
    to: params.to,
    subject: `Nuovo ordine #${params.orderId} (${amountLabel}) — Green Mind Group`,
    text: [
      `Ciao,`,
      ``,
      `${params.memberName} (${params.memberCode}) ha effettuato l'ordine #${params.orderId} da ${amountLabel}.`,
      ``,
      `Vai su Shop → Ordini, nel back office, per evaderlo.`,
      ``,
      `Green Mind Group`,
    ].join("\n"),
    html: renderEmailHtml({
      heading: `Nuovo ordine #${params.orderId}`,
      bodyHtml: `
        <p style="margin:0 0 4px 0;">
          <strong style="color:#111318;">${escapeHtml(params.memberName)}</strong>
          <span style="color:#8f929c;"> (${escapeHtml(params.memberCode)})</span>
        </p>
        <p style="margin:0 0 20px 0;">ha effettuato un ordine da <strong style="color:#111318;">${escapeHtml(amountLabel)}</strong>.</p>
      `,
      cta: { label: "Vai agli ordini", href: `${SITE_URL}/shop/ordini` },
    }),
  });
}
