"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function EventPhotoUpload({
  initialUrl,
  onChange,
}: {
  initialUrl?: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Immagine troppo grande (max 5MB)");
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("event-photos").upload(path, file);

    setUploading(false);

    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("event-photos").getPublicUrl(path);

    setPreview(publicUrl);
    onChange(publicUrl);
  }

  function handleRemove() {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Foto / mappa indicazioni luogo (opzionale)
      </span>
      {preview ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Foto evento" className="h-28 w-auto rounded-lg object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
            aria-label="Rimuovi foto"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 w-fit rounded-lg border border-dashed border-gray-300 dark:border-white/15 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
        >
          <ImagePlus size={16} />
          {uploading ? "Caricamento..." : "Scegli file"}
        </button>
      )}
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
