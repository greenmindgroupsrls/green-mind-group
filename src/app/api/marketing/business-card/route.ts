import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";

// Dimensioni biglietto da visita standard 89x51mm, convertite in punti PDF
// (1mm = 2.83465pt).
const CARD_WIDTH = 252.3;
const CARD_HEIGHT = 144.6;

const GOLD = rgb(0.55, 0.42, 0.15);

async function fetchImageBytes(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Impossibile scaricare il template (${url})`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function GET() {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Devi essere autenticato" }, { status: 401 });
  }

  const supabase = await createClient();

  const [{ data: memberRow }, { data: profileRow }, { data: docRow }] = await Promise.all([
    supabase.from("members").select("first_name, last_name, email").eq("activity_code", member.activity_code).single(),
    supabase
      .from("member_profiles")
      .select("phone_country_code, phone_number")
      .eq("activity_code", member.activity_code)
      .single(),
    supabase
      .from("marketing_documents")
      .select("template_front_url, template_back_url")
      .eq("doc_type", "business_card")
      .single(),
  ]);

  if (!docRow?.template_front_url || !docRow?.template_back_url) {
    return NextResponse.json({ error: "Template non ancora caricati dall'azienda" }, { status: 404 });
  }

  const fullName = [memberRow?.first_name, memberRow?.last_name].filter(Boolean).join(" ") || member.username;
  const phone =
    profileRow?.phone_country_code && profileRow?.phone_number
      ? `${profileRow.phone_country_code} ${profileRow.phone_number}`
      : null;
  const email = memberRow?.email ?? null;

  const [frontBytes, backBytes] = await Promise.all([
    fetchImageBytes(docRow.template_front_url),
    fetchImageBytes(docRow.template_back_url),
  ]);

  const pdf = await PDFDocument.create();
  const frontImage = await pdf.embedPng(frontBytes);
  const backImage = await pdf.embedPng(backBytes);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);

  function drawCover(page: import("pdf-lib").PDFPage, image: import("pdf-lib").PDFImage) {
    const scale = Math.max(CARD_WIDTH / image.width, CARD_HEIGHT / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    page.drawImage(image, {
      x: (CARD_WIDTH - w) / 2,
      y: (CARD_HEIGHT - h) / 2,
      width: w,
      height: h,
    });
  }

  const frontPage = pdf.addPage([CARD_WIDTH, CARD_HEIGHT]);
  drawCover(frontPage, frontImage);

  const nameSize = 12;
  const detailSize = 8;
  const lineGap = 4;
  const lines = [phone, email].filter((v): v is string => Boolean(v));
  const blockHeight = nameSize + lines.length * (detailSize + lineGap);
  let cursorY = CARD_HEIGHT / 2 + blockHeight / 2;

  frontPage.drawText(fullName, {
    x: CARD_WIDTH / 2 - fontBold.widthOfTextAtSize(fullName, nameSize) / 2,
    y: cursorY - nameSize,
    size: nameSize,
    font: fontBold,
    color: GOLD,
  });
  cursorY -= nameSize + lineGap;

  for (const line of lines) {
    frontPage.drawText(line, {
      x: CARD_WIDTH / 2 - fontRegular.widthOfTextAtSize(line, detailSize) / 2,
      y: cursorY - detailSize,
      size: detailSize,
      font: fontRegular,
      color: GOLD,
    });
    cursorY -= detailSize + lineGap;
  }

  const backPage = pdf.addPage([CARD_WIDTH, CARD_HEIGHT]);
  drawCover(backPage, backImage);

  const pdfBytes = await pdf.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="business-card-${member.username}.pdf"`,
    },
  });
}
