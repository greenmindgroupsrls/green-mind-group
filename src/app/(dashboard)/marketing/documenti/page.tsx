import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { createClient } from "@/lib/supabase/server";
import { MarketingDocumentRow } from "./marketing-document-row";
import { BusinessCardRow } from "./business-card-row";
import { getDizionario } from "@/i18n/dizionario";


function fileNameFromUrl(url: string | null) {
  if (!url) return null;
  try {
    return decodeURIComponent(url.split("/").pop() ?? "");
  } catch {
    return null;
  }
}

export default async function MarketingDocumentiPage() {
  const T = (await getDizionario()).marketing;
  // Le etichette dipendono dalla lingua: l'elenco vive dentro la pagina.
  const DOC_TYPES: { type: string; label: string }[] = [
    { type: "privacy", label: T.docPrivacy },
    { type: "modulo_ordine", label: T.docOrdine },
    { type: "contratto_incaricato", label: T.docContratto },
    { type: "presentazione", label: T.docPresentazione },
    { type: "flyer", label: T.docFlyer },
    { type: "piano_compensi", label: T.docPiano },
    { type: "scheda_prodotto", label: T.docProdotto },
  ];
  if (!supabaseConfigured()) {
    return (
      <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
        Supabase non ancora collegato: i documenti non sono disponibili in modalità demo.
      </p>
    );
  }

  const member = await getCurrentMember();
  const isRoot = member?.activity_code === 0;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("marketing_documents")
    .select("doc_type, file_url, file_name, template_front_url, template_back_url");
  const byType = new Map((rows ?? []).map((r) => [r.doc_type, r]));
  const businessCard = byType.get("business_card");

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      {DOC_TYPES.map(({ type, label }) => {
        const row = byType.get(type);
        return (
          <MarketingDocumentRow
            key={type}
            docType={type}
            label={label}
            fileUrl={row?.file_url ?? null}
            fileName={row?.file_name ?? null}
            isRoot={isRoot}
          />
        );
      })}
      <BusinessCardRow
        frontFileName={fileNameFromUrl(businessCard?.template_front_url ?? null)}
        backFileName={fileNameFromUrl(businessCard?.template_back_url ?? null)}
        ready={Boolean(businessCard?.template_front_url && businessCard?.template_back_url)}
        isRoot={isRoot}
      />
    </div>
  );
}
