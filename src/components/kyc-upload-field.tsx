"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "uploading" | "done" | "error";

export type KycDocType = "id_proof" | "utility_bill" | "account_statement" | "vat_certificate";

// Unico modulo di caricamento per tutti i documenti personali: finiscono
// tutti nello stesso archivio privato, in una cartella per codice attivita',
// visibile solo all'interessato e all'azienda.
export function KycUploadField({
  docType,
  label,
  nota,
  activityCode,
  uploaded,
  onUploaded,
}: {
  docType: KycDocType;
  label: string;
  nota?: string;
  activityCode: number;
  uploaded: boolean;
  onUploaded?: (caricato: boolean) => void;
}) {
  const [status, setStatus] = useState<Status>(uploaded ? "done" : "idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setStatus("error");
      setError("File troppo grande (max 8MB)");
      return;
    }

    setStatus("uploading");
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${activityCode}/${docType}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setStatus("error");
      setError(uploadError.message);
      return;
    }

    const { error: rpcError } = await supabase.rpc("register_kyc_document", {
      p_doc_type: docType,
      p_storage_path: path,
    });

    if (rpcError) {
      setStatus("error");
      setError(rpcError.message);
      return;
    }

    setFileName(file.name);
    setStatus("done");
    onUploaded?.(true);
  }

  return (
    <div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-3 mt-1.5">
        <label className="glass-input px-3.5 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex-1 flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">
            {status === "uploading"
              ? "Caricamento..."
              : fileName || (status === "done" ? "Documento caricato" : "Nessun file selezionato")}
          </span>
          {status === "done" && <CheckCircle2 size={16} className="text-green-600 dark:text-green-400 shrink-0" />}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleChange} />
        </label>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {nota ? `${nota} ` : ""}Formati ammessi: PDF, JPG, PNG — max 8MB.
      </p>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}
