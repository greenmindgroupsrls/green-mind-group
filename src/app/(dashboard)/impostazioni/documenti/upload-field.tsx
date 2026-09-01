"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "uploading" | "done" | "error";

export function UploadField({
  docType,
  label,
  activityCode,
  uploaded,
}: {
  docType: "id_proof" | "utility_bill" | "account_statement";
  label: string;
  activityCode: number;
  uploaded: boolean;
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
  }

  return (
    <div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-3 mt-1.5">
        <label className="rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex-1 flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">
            {status === "uploading"
              ? "Caricamento..."
              : fileName || (status === "done" ? "Documento caricato" : "Nessun file selezionato")}
          </span>
          {status === "done" && <CheckCircle2 size={16} className="text-green-600 dark:text-green-400 shrink-0" />}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleChange} />
        </label>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        Formati ammessi: PDF, JPG, PNG — max 8MB.
      </p>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}
