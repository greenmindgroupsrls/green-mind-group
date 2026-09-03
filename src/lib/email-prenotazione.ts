import { sendEmail } from "./email";

// Le due email di una prenotazione dal sito Vortix: la conferma al cliente e
// la notifica all'azienda. Vivevano in una Edge Function sul progetto
// Supabase separato; stanno qui perche' ora la prenotazione passa dal back
// office e non c'e' piu' motivo di tenerle altrove.
//
// La grafica resta quella del prodotto (sabbia, teal, oro) e non quella del
// back office: chi le riceve e' un cliente finale che ha visto il sito
// VORTIX, non un incaricato.
//
// ATTENZIONE — hello@greenmindgroup.pro e' l'unica casella reale sul
// dominio, e si usa come mittente per entrambe. Non reintrodurre un
// Reply-To su un dominio diverso dal mittente: la versione precedente aveva
// From @greenmindgroup.pro e Reply-To @gmail.com, e mail-tester penalizzava
// l'email di 2,5 punti su 10 con FREEMAIL_FORGED_REPLYTO ("Freemail in
// Reply-To, but not From"), lo schema classico del phishing. Era la causa
// principale delle email finite nello spam.
const MITTENTE = "VORTIX <hello@greenmindgroup.pro>";
const DESTINATARIO_INTERNO = "greenmindgroupsrls@gmail.com";

// Palette VORTIX (tema chiaro, da public/company/css/style.css)
const INK = "#0b2529";
const INK_DIM = "#3e5c60";
const INK_FAINT = "#7c9194";
const SAND = "#e8dcc8";
const CREAM = "#f1e3cb";
const GOLD = "#b29b72";

// Nelle email i webfont non sono affidabili (molti programmi di posta li
// rimuovono): stack di sistema, uguale su tutti i dispositivi.
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function esc(v: unknown): string {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function dataInItaliano(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export type Prenotazione = {
  name: string;
  phone: string;
  email: string;
  address: string | null;
  notes: string | null;
  booking_date: string | null;
  booking_time: string | null;
};

function quandoTestuale(p: Prenotazione): string {
  if (!p.booking_date) return "";
  return `${dataInItaliano(p.booking_date)}${p.booking_time ? ` alle ${p.booking_time}` : ""}`;
}

// ---------- Notifica all'azienda ----------
function notificaInterna(p: Prenotazione, quando: string) {
  const riga = (etichetta: string, valore: unknown) =>
    valore
      ? `<tr>
           <td style="padding:7px 0;font-size:13px;color:${INK_FAINT};width:110px;vertical-align:top;">${etichetta}</td>
           <td style="padding:7px 0;font-size:15px;color:${INK};font-weight:600;">${esc(valore)}</td>
         </tr>`
      : "";

  const html = `<!doctype html>
<html lang="it"><body style="margin:0;padding:24px;background:${SAND};font-family:${FONT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;">
    <tr><td style="background:${INK};padding:18px 28px;">
      <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:.18em;">VORTIX</span>
      <span style="color:${GOLD};font-size:13px;letter-spacing:.08em;"> &nbsp;·&nbsp; NUOVA PRENOTAZIONE</span>
    </td></tr>
    <tr><td style="padding:28px;">
      <p style="margin:0 0 18px;font-size:17px;color:${INK};font-weight:700;">${esc(p.name)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${riga("Quando", quando)}
        ${riga("Telefono", p.phone)}
        ${riga("Email", p.email)}
        ${riga("Indirizzo", p.address)}
        ${riga("Note", p.notes)}
      </table>
      <p style="margin:22px 0 0;padding-top:16px;border-top:1px solid rgba(11,37,41,0.10);font-size:13px;color:${INK_FAINT};line-height:1.6;">
        Il cliente ha già ricevuto la conferma automatica: si aspetta una chiamata <strong style="color:${INK_DIM};">entro 24 ore</strong>.<br/>
        Trovi la richiesta anche nel back office, in Marketing &rsaquo; Lead.
      </p>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    "NUOVA PRENOTAZIONE VORTIX",
    "",
    `Nome: ${p.name}`,
    quando ? `Quando: ${quando}` : "",
    `Telefono: ${p.phone}`,
    `Email: ${p.email}`,
    p.address ? `Indirizzo: ${p.address}` : "",
    p.notes ? `Note: ${p.notes}` : "",
    "",
    "Il cliente ha già ricevuto la conferma automatica e si aspetta una chiamata entro 24 ore.",
    "Trovi la richiesta anche nel back office, in Marketing > Lead.",
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}

// ---------- Conferma al cliente ----------
function confermaCliente(p: Prenotazione, quando: string) {
  const saluto = p.name ? ` ${p.name}` : "";

  const html = `<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${SAND};font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Un nostro tecnico ti contatterà entro 24 ore per confermare l'appuntamento.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SAND};padding:28px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">

        <tr><td style="background:${INK};padding:22px 32px;text-align:center;">
          <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:.22em;">VORTIX</span>
          <div style="color:${GOLD};font-size:11px;letter-spacing:.14em;margin-top:5px;">POTENZA SENZA LIMITI</div>
        </td></tr>

        <tr><td style="padding:36px 32px 8px;">
          <h1 style="margin:0 0 6px;font-size:23px;line-height:1.3;color:${INK};font-weight:700;">Richiesta ricevuta</h1>
          <p style="margin:0 0 22px;font-size:16px;line-height:1.65;color:${INK_DIM};">
            Ciao${esc(saluto)}, grazie per aver richiesto una dimostrazione gratuita di VORTIX${
              quando ? ` per il <strong style="color:${INK};">${esc(quando)}</strong>` : ""
            }.
          </p>
        </td></tr>

        <tr><td style="padding:0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};border-radius:10px;">
            <tr><td style="padding:20px 22px;border-left:3px solid ${GOLD};border-radius:10px;">
              <div style="font-size:11px;letter-spacing:.13em;color:${GOLD};font-weight:700;margin-bottom:7px;">COSA SUCCEDE ORA</div>
              <div style="font-size:16px;line-height:1.6;color:${INK};font-weight:600;">
                Un nostro tecnico ti contatterà entro 24 ore per confermare l'appuntamento.
              </div>
            </td></tr>
          </table>
        </td></tr>

        ${
          p.address
            ? `<tr><td style="padding:20px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size:13px;color:${INK_FAINT};width:96px;vertical-align:top;padding:3px 0;">Indirizzo</td>
              <td style="font-size:15px;color:${INK};padding:3px 0;">${esc(p.address)}</td>
            </tr>
          </table>
        </td></tr>`
            : ""
        }

        <tr><td style="padding:24px 32px 0;">
          <p style="margin:0;font-size:15px;line-height:1.7;color:${INK_DIM};">
            La dimostrazione è <strong style="color:${INK};">gratuita, a domicilio e senza impegno</strong>: il tecnico installa VORTIX sotto il tuo lavello e te lo mostra in funzione.
          </p>
        </td></tr>

        <tr><td style="padding:24px 32px 32px;">
          <p style="margin:0;padding-top:20px;border-top:1px solid rgba(11,37,41,0.10);font-size:14px;line-height:1.7;color:${INK_FAINT};">
            Hai domande? Rispondi pure direttamente a questa email.<br/><br/>
            A presto,<br/>
            <strong style="color:${INK};">Il team VORTIX</strong>
          </p>
        </td></tr>

      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td style="padding:18px 32px;text-align:center;font-size:12px;line-height:1.7;color:${INK_FAINT};">
          Green Mind Group S.r.l.s.<br/>
          <a href="https://greenmindgroup.pro" style="color:${INK_DIM};text-decoration:none;">greenmindgroup.pro</a>
        </td></tr>
      </table>

    </td></tr>
  </table>
</body></html>`;

  const text = [
    `Ciao${saluto},`,
    "",
    `abbiamo ricevuto la tua richiesta di dimostrazione gratuita VORTIX${quando ? ` per il ${quando}` : ""}.`,
    "",
    "COSA SUCCEDE ORA",
    "Un nostro tecnico ti contatterà entro 24 ore per confermare l'appuntamento.",
    "",
    p.address ? `Indirizzo indicato: ${p.address}` : "",
    "La dimostrazione è gratuita, a domicilio e senza impegno di acquisto:",
    "il tecnico installa VORTIX sotto il tuo lavello e te lo mostra in funzione.",
    "",
    "Se hai domande, puoi rispondere direttamente a questa email.",
    "",
    "A presto,",
    "Il team VORTIX",
    "",
    "Green Mind Group S.r.l.s. — greenmindgroup.pro",
  ]
    .filter((r) => r !== "")
    .join("\n");

  return { html, text };
}

// Le email non devono mai far fallire la prenotazione: se la posta non parte
// il cliente ha comunque prenotato, e il lead e' comunque a sistema.
export async function inviaEmailPrenotazione(p: Prenotazione) {
  const quando = quandoTestuale(p);

  const interna = notificaInterna(p, quando);
  const cliente = confermaCliente(p, quando);

  await Promise.allSettled([
    sendEmail({
      from: MITTENTE,
      to: DESTINATARIO_INTERNO,
      subject: `Nuova prenotazione — ${p.name}${quando ? ` · ${quando}` : ""}`,
      html: interna.html,
      text: interna.text,
    }),
    sendEmail({
      from: MITTENTE,
      to: p.email,
      subject: "Richiesta ricevuta: ti contattiamo entro 24 ore",
      html: cliente.html,
      text: cliente.text,
    }),
  ]);
}
