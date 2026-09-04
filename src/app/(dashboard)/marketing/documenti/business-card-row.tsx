"use client";

import { useRef, useState, useTransition } from "react";
import { CreditCard, Upload, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setBusinessCardTemplate } from "./actions";

function TemplateSlot({
  side,
  label,
  fileName,
}: {
  side: "front" | "back";
  label: string;
  fileName: string | null;
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
    const ext = file.name.split(".").pop() ?? "png";
    const path = `business_card/${side}-${crypto.randomUUID()}.${ext}`;

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
        await setBusinessCardTemplate(side, publicUrl, file.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore imprevisto");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-white/10 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{fileName ?? "Non caricato"}</p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || pending}
        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 shrink-0"
      >
        <Upload size={12} />
        {uploading || pending ? "Caricamento..." : fileName ? "Sostituisci" : "Carica"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function BusinessCardRow({
  frontFileName,
  backFileName,
  ready,
  isRoot,
}: {
  frontFileName: string | null;
  backFileName: string | null;
  ready: boolean;
  isRoot: boolean;
}) {
  return (
    <div className="glass-card px-5 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <CreditCard size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">Business Card</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {ready ? "Con i tuoi dati, generato al momento" : "Non ancora disponibile"}
            </p>
          </div>
        </div>

        {ready && (
          <a
            href="/api/marketing/business-card"
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors shrink-0"
          >
            <Download size={14} />
            Scarica
          </a>
        )}
      </div>

      {isRoot && (
        <div className="flex flex-col gap-2 pt-1 border-t border-gray-100 dark:border-white/5">
          <p className="text-xs text-gray-500 dark:text-gray-400 pt-2">
            Template usati per generare il PDF di ogni incaricato — il fronte (senza logo) riceve
            automaticamente nome, telefono ed email di chi lo scarica.
          </p>
          <TemplateSlot side="front" label="Fronte (senza logo)" fileName={frontFileName} />
          <TemplateSlot side="back" label="Retro (con logo)" fileName={backFileName} />
        </div>
      )}
    </div>
  );
}
