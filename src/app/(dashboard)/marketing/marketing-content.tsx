"use client";

import { useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Pencil, Plus } from "lucide-react";
import { setCallScript, addCallScript } from "./actions";

type CallScript = { id: number; label: string; body: string };

const inputClass =
  "glass-input px-3.5 py-2 text-sm";

export function MarketingContent({
  slug,
  name,
  scripts: initialScripts,
  isRoot,
}: {
  slug: string;
  name: string;
  scripts: CallScript[];
  isRoot: boolean;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [scripts, setScripts] = useState(initialScripts);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Stesso pattern di personal-link-field.tsx: window.location.origin è
  // statico per tutta la vita della pagina, non serve stato reattivo — solo
  // un calcolo diretto nel render (guardato per l'SSR).
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = origin ? `${origin}/r/${slug}` : `/r/${slug}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(link, { width: 240, margin: 1, color: { dark: "#0e0b21", light: "#ffffff" } })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [link]);

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  }

  function renderedText(body: string) {
    return body.replaceAll("{{link}}", link);
  }

  async function copyScript(id: number, body: string) {
    await navigator.clipboard.writeText(renderedText(body));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function startEdit(script: CallScript) {
    setError(null);
    setAdding(false);
    setEditingId(script.id);
    setDraftLabel(script.label);
    setDraftBody(script.body);
  }

  function startAdd() {
    setError(null);
    setEditingId(null);
    setAdding(true);
    setDraftLabel(`Call ${scripts.length + 1}`);
    setDraftBody("");
  }

  function cancelEdit() {
    setEditingId(null);
    setAdding(false);
    setError(null);
  }

  function saveEdit() {
    if (editingId === null) return;
    setError(null);
    startTransition(async () => {
      try {
        await setCallScript(editingId, draftLabel, draftBody);
        setScripts((prev) =>
          prev.map((s) => (s.id === editingId ? { ...s, label: draftLabel, body: draftBody } : s)),
        );
        setEditingId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore imprevisto");
      }
    });
  }

  function saveAdd() {
    setError(null);
    startTransition(async () => {
      try {
        const created = await addCallScript(draftLabel, draftBody);
        setScripts((prev) => [...prev, created]);
        setAdding(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore imprevisto");
      }
    });
  }

  const bannerUrl = `/api/marketing/banner?name=${encodeURIComponent(name)}&link=${encodeURIComponent(link)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Il tuo link personale</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 break-all rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3.5 py-2.5">
              {link}
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-2 glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium"
              >
                {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                {linkCopied ? "Copiato" : "Copia link"}
              </button>
              <a
                href={bannerUrl}
                download="green-mind-group-banner.png"
                className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-white/10 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <Download size={16} />
                Scarica banner
              </a>
            </div>
          </div>
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR code del link personale"
              className="h-36 w-36 rounded-lg border border-gray-200 dark:border-white/10 bg-white p-2 justify-self-center"
            />
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Testi pronti da condividere</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Copia, incolla, personalizza se vuoi — il link è già dentro.
        </p>
        <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5">
          {scripts.map((script) => (
            <div key={script.id} className="py-4 first:pt-0 last:pb-0">
              {editingId === script.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={draftLabel}
                    onChange={(e) => setDraftLabel(e.target.value)}
                    className={inputClass}
                    placeholder="Etichetta"
                  />
                  <textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    rows={4}
                    className={`${inputClass} resize-y`}
                    placeholder="Testo del messaggio (usa {{link}} dove vuoi che compaia il link personale)"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={pending}
                      className="glass-btn-primary rounded-lg px-3.5 py-2 text-xs font-medium disabled:opacity-50"
                    >
                      {pending ? "Salvataggio..." : "Salva"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-gray-300 dark:border-white/10 px-3.5 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{script.label}</p>
                    <div className="flex items-center gap-3 shrink-0">
                      {isRoot && (
                        <button
                          type="button"
                          onClick={() => startEdit(script)}
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:opacity-80"
                        >
                          <Pencil size={13} />
                          Modifica
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copyScript(script.id, script.body)}
                        className="flex items-center gap-1.5 text-xs font-medium text-accent hover:opacity-80"
                      >
                        {copiedId === script.id ? <Check size={13} /> : <Copy size={13} />}
                        {copiedId === script.id ? "Copiato" : "Copia"}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-white/5 px-3.5 py-2.5">
                    {renderedText(script.body)}
                  </p>
                </>
              )}
            </div>
          ))}

          {adding && (
            <div className="py-4 last:pb-0">
              <div className="flex flex-col gap-2">
                <input
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  className={inputClass}
                  placeholder="Etichetta"
                />
                <textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  rows={4}
                  className={`${inputClass} resize-y`}
                  placeholder="Testo del messaggio (usa {{link}} dove vuoi che compaia il link personale)"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveAdd}
                    disabled={pending}
                    className="glass-btn-primary rounded-lg px-3.5 py-2 text-xs font-medium disabled:opacity-50"
                  >
                    {pending ? "Salvataggio..." : "Salva"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-lg border border-gray-300 dark:border-white/10 px-3.5 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2 mt-4">
            {error}
          </p>
        )}

        {isRoot && !adding && (
          <button
            type="button"
            onClick={startAdd}
            className="flex items-center gap-1.5 text-sm font-medium text-accent hover:opacity-80 mt-4"
          >
            <Plus size={15} />
            Aggiungi Call
          </button>
        )}
      </div>
    </div>
  );
}
