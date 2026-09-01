"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const readOnlyClass =
  "h-11 flex items-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 px-3.5 text-sm";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

// Il link personale non si digita più a mano: viene assegnato in automatico
// (coincide con lo username, già garantito univoco) al momento
// dell'iscrizione — qui è solo mostrato, con copia rapida.
export function PersonalLinkField({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullUrl = `${origin}/r/${slug}`;

  if (!slug) return null;

  async function handleCopy() {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>Link personale</span>
      <div className={`${readOnlyClass} justify-between gap-2`}>
        <span className="truncate">/r/{slug}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1 text-xs font-medium text-accent hover:opacity-80"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copiato" : "Copia"}
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{fullUrl}</p>
    </label>
  );
}
