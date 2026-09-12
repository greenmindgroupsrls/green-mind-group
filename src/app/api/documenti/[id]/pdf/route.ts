import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import { nomeFilePdf, type TipoDocumento } from "@/lib/documenti";

// Il PDF firmato non ha un indirizzo pubblico: sta in un bucket privato e
// passa da qui, dove la sessione di chi scarica viene verificata dalle
// regole del database prima di leggere il file.

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const membro = await getCurrentMember();
  if (!membro) return NextResponse.json({ error: "Devi essere autenticato" }, { status: 401 });

  const { id } = await params;
  const documentId = Number(id);
  if (!Number.isInteger(documentId)) {
    return NextResponse.json({ error: "Documento non valido" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: documento } = await supabase
    .from("signed_documents")
    .select("numero, doc_type, pdf_path")
    .eq("id", documentId)
    .maybeSingle();

  if (!documento) return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
  if (!documento.pdf_path) {
    return NextResponse.json({ error: "Documento non ancora generato" }, { status: 404 });
  }

  const { data: file, error } = await supabase.storage
    .from("documenti-firmati")
    .download(documento.pdf_path);
  if (error || !file) {
    return NextResponse.json({ error: "File non disponibile" }, { status: 404 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeFilePdf(documento.doc_type as TipoDocumento, documento.numero)}"`,
      "Cache-Control": "no-store",
    },
  });
}
