"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Upload, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setMarketingDocument } from "./actions";

export function MarketingDocumentRow({
  docType,
  label,
  fileUrl,
  fileName,
  isRoot,
}: {
  docType: string;
  label: string;
  fileUrl: string | null;
  fileName: string | null;
  isRoot: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError("File troppo grande (max 15MB)");
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `${docType}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("marketing-documents").upload(path, file);

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("marketing-documents").getPublicUrl(path);

    startTransition(async () => {
      try {
        await setMarketingDocument(docType, publicUrl, file.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore imprevisto");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] px-5 py-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {fileName ?? "Non ancora caricato"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
            >
              <Download size={14} />
              Scarica
            </a>
          )}
          {isRoot && (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading || pending}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <Upload size={14} />
                {uploading || pending ? "Caricamento..." : fileUrl ? "Sostituisci" : "Carica"}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleChange}
              />
            </>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
