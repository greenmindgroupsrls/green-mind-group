"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MemberAvatar } from "@/components/member-avatar";

const AVATAR_SIZE = 256;

// La foto profilo viene mostrata al massimo a 64px nell'interfaccia: non ha
// senso salvarla e servirla alla risoluzione originale (spesso diversi MB su
// una foto da telefono). Qui la ritagliamo al centro (quadrata, come
// object-fit: cover) e la ricomprimiamo in JPEG prima di caricarla, cosi'
// l'output e' sempre di poche centinaia di KB indipendentemente da cosa ha
// scelto l'utente — nessun errore "file troppo grande" nell'uso normale.
async function resizeToSquareJpeg(file: File, size = AVATAR_SIZE, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const cropSize = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - cropSize) / 2;
  const sy = (bitmap.height - cropSize) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossibile elaborare l'immagine");
  ctx.drawImage(bitmap, sx, sy, cropSize, cropSize, 0, 0, size, size);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Impossibile comprimere l'immagine"))),
      "image/jpeg",
      quality,
    );
  });
}

export function AvatarUpload({
  activityCode,
  username,
  avatarUrl,
}: {
  activityCode: number;
  username: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError("Immagine troppo grande (max 20MB)");
      return;
    }

    setUploading(true);
    setError(null);

    let resized: Blob;
    try {
      resized = await resizeToSquareJpeg(file);
    } catch {
      setUploading(false);
      setError("Impossibile elaborare questa immagine, riprova con un altro file");
      return;
    }

    const supabase = createClient();
    const path = `${activityCode}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, resized, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    // Evita risposte cache stantie: la stessa path viene riusata a ogni
    // upload, quindi serve un parametro che cambi per bustare la cache.
    const bustedUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: rpcError } = await supabase.rpc("set_own_avatar", {
      p_avatar_url: bustedUrl,
    });

    setUploading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setPreview(bustedUrl);
    router.refresh();
  }

  return (
    <div className="relative inline-block">
      <MemberAvatar code={activityCode} username={username} size={64} avatarUrl={preview} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        aria-label="Cambia immagine profilo"
        title="Cambia immagine profilo"
      >
        <Camera size={13} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-2 max-w-[140px]">{error}</p>}
    </div>
  );
}
