import { renderEmailHtml, sendEmail, SITE_URL } from "./email";
import { MINUTI_VALIDITA_CODICE, ORE_VALIDITA_LINK } from "./documenti";

// LE EMAIL DELLA FIRMA
//
// Tre email, tre momenti: il link per firmare dal proprio telefono, il
// codice che dimostra che a firmare e' la persona giusta, e la copia
// firmata del documento.
//
// L'ultima non e' una cortesia: il contratto promette al cliente una copia
// su supporto durevole, e senza carta quella copia e' questa email.
//
// Stesso pattern best-effort del resto del progetto: se RESEND_API_KEY non
// e' configurata non parte nulla e il documento resta comunque firmato e
// archiviato.

function escape(valore: string) {
  return valore
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendLinkFirmaEmail(params: {
  to: string;
  nomeFirmatario: string;
  documento: string;
  numero: string;
  url: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `Firma ${params.documento} (${params.numero}) — Green Mind Group`,
    text: [
      `Ciao ${params.nomeFirmatario},`,
      ``,
      `per firmare il documento "${params.documento}" (n. ${params.numero}) apri questo link dal tuo telefono:`,
      params.url,
      ``,
      `Il link vale ${ORE_VALIDITA_LINK} ore. Prima di firmare ti chiederemo un codice di conferma, che riceverai per email.`,
      ``,
      `Green Mind Group`,
    ].join("\n"),
    html: renderEmailHtml({
      heading: "Firma il tuo documento",
      bodyHtml: `
        <p style="margin:0 0 16px 0;">Ciao ${escape(params.nomeFirmatario)},</p>
        <p style="margin:0 0 20px 0;">
          puoi firmare <strong style="color:#111318;">${escape(params.documento)}</strong>
          <span style="color:#8f929c;">(n. ${escape(params.numero)})</span> direttamente dal tuo telefono:
          apri il link qui sotto e firma con il dito.
        </p>
        <p style="margin:0 0 8px 0;color:#8f929c;font-size:13px;">
          Il link vale ${ORE_VALIDITA_LINK} ore. Prima della firma ti chiederemo un codice di conferma inviato a questo indirizzo.
        </p>
      `,
      cta: { label: "Apri e firma", href: params.url },
    }),
  });
}

export async function sendCodiceFirmaEmail(params: {
  to: string;
  codice: string;
  documento: string;
  numero: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `Codice di conferma ${params.codice} — Green Mind Group`,
    text: [
      `Il codice per firmare "${params.documento}" (n. ${params.numero}) è: ${params.codice}`,
      ``,
      `Vale ${MINUTI_VALIDITA_CODICE} minuti. Se non hai richiesto tu questa firma, ignora questa email e avvisaci.`,
      ``,
      `Green Mind Group`,
    ].join("\n"),
    html: renderEmailHtml({
      heading: "Il tuo codice di conferma",
      bodyHtml: `
        <p style="margin:0 0 16px 0;">Per firmare <strong style="color:#111318;">${escape(params.documento)}</strong>
          <span style="color:#8f929c;">(n. ${escape(params.numero)})</span> inserisci questo codice:</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
          <tr>
            <td style="background-color:#f7f8fa;border-radius:10px;padding:14px 22px;">
              <span style="font-size:26px;font-weight:700;letter-spacing:0.18em;color:#111318;">${escape(params.codice)}</span>
            </td>
          </tr>
        </table>
        <p style="margin:0;color:#8f929c;font-size:13px;">
          Vale ${MINUTI_VALIDITA_CODICE} minuti. Se non hai richiesto tu questa firma, ignora questa email e avvisaci.
        </p>
      `,
    }),
  });
}

export async function sendCopiaFirmataEmail(params: {
  to: string;
  nomeFirmatario: string;
  documento: string;
  numero: string;
  pdf: Buffer;
  nomeFile: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `Copia firmata: ${params.documento} (${params.numero}) — Green Mind Group`,
    text: [
      `Ciao ${params.nomeFirmatario},`,
      ``,
      `in allegato trovi la copia firmata di "${params.documento}" (n. ${params.numero}).`,
      ``,
      `Conservala: è il tuo esemplare del documento.`,
      ``,
      `Green Mind Group`,
    ].join("\n"),
    html: renderEmailHtml({
      heading: "La tua copia firmata",
      bodyHtml: `
        <p style="margin:0 0 16px 0;">Ciao ${escape(params.nomeFirmatario)},</p>
        <p style="margin:0 0 20px 0;">
          in allegato trovi la copia firmata di
          <strong style="color:#111318;">${escape(params.documento)}</strong>
          <span style="color:#8f929c;">(n. ${escape(params.numero)})</span>. Conservala: è il tuo esemplare del documento.
        </p>
        <p style="margin:0;color:#8f929c;font-size:13px;">
          Per assistenza scrivi a hello@greenmindgroup.pro.
        </p>
      `,
      cta: { label: "Vai al back office", href: `${SITE_URL}/dashboard` },
    }),
    attachments: [{ filename: params.nomeFile, content: params.pdf }],
  });
}
