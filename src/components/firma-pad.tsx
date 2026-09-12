"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, PenLine, X } from "lucide-react";

// IL RIQUADRO PER FIRMARE COL DITO
//
// Si apre a tutto schermo perche' si firma col dito su un telefono o un
// tablet: in un riquadro piccolo la firma viene storta e illeggibile.
//
// Tre accortezze che fanno la differenza sul telefono:
// - touch-action: none sul canvas, altrimenti il dito scorre la pagina
//   invece di disegnare;
// - il canvas ha piu' pixel veri della sua dimensione a schermo
//   (devicePixelRatio), altrimenti il tratto esce sgranato;
// - il tratto si disegna con curve tra i punti, non con segmenti dritti,
//   se no una firma veloce diventa una spezzata.
//
// L'immagine esce in PNG con lo sfondo trasparente: va sovrapposta al
// documento, e uno sfondo bianco coprirebbe la riga della firma.

type Punto = { x: number; y: number };

export function FirmaPad({
  titolo,
  sottotitolo,
  onFirma,
  onChiudi,
  inCorso = false,
}: {
  titolo: string;
  sottotitolo?: string;
  onFirma: (pngDataUrl: string) => void;
  onChiudi: () => void;
  inCorso?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const disegnando = useRef(false);
  const ultimo = useRef<Punto | null>(null);
  const [vuota, setVuota] = useState(true);

  // Il canvas si adatta allo spazio che ha, e si ridimensiona se il
  // dispositivo viene ruotato mentre e' aperto.
  const preparaCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scala = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * scala));
    canvas.height = Math.max(1, Math.round(rect.height * scala));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scala, scala);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111318";
  }, []);

  useEffect(() => {
    preparaCanvas();
    window.addEventListener("resize", preparaCanvas);
    window.addEventListener("orientationchange", preparaCanvas);
    return () => {
      window.removeEventListener("resize", preparaCanvas);
      window.removeEventListener("orientationchange", preparaCanvas);
    };
  }, [preparaCanvas]);

  // Esc chiude: su tablet con tastiera e' il gesto che tutti provano.
  useEffect(() => {
    const suTasto = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChiudi();
    };
    window.addEventListener("keydown", suTasto);
    return () => window.removeEventListener("keydown", suTasto);
  }, [onChiudi]);

  const posizione = (e: React.PointerEvent<HTMLCanvasElement>): Punto => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const inizia = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    disegnando.current = true;
    ultimo.current = posizione(e);
    setVuota(false);
  };

  const muovi = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!disegnando.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const precedente = ultimo.current;
    if (!ctx || !precedente) return;

    const punto = posizione(e);
    const mezzo = { x: (precedente.x + punto.x) / 2, y: (precedente.y + punto.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(precedente.x, precedente.y);
    ctx.quadraticCurveTo(precedente.x, precedente.y, mezzo.x, mezzo.y);
    ctx.stroke();
    ultimo.current = punto;
  };

  const finisci = () => {
    disegnando.current = false;
    ultimo.current = null;
  };

  const cancella = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setVuota(true);
  };

  const conferma = () => {
    const canvas = canvasRef.current;
    if (!canvas || vuota) return;
    onFirma(canvas.toDataURL("image/png"));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl flex flex-col max-h-full overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">{titolo}</h2>
            {sottotitolo && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sottotitolo}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onChiudi}
            aria-label="Chiudi"
            className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-lg glass-btn-soft text-gray-600 dark:text-gray-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-3">
          <div className="relative rounded-xl border-2 border-dashed border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/5">
            <canvas
              ref={canvasRef}
              onPointerDown={inizia}
              onPointerMove={muovi}
              onPointerUp={finisci}
              onPointerCancel={finisci}
              onPointerLeave={finisci}
              className="w-full h-48 sm:h-64 touch-none rounded-xl"
            />
            {vuota && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-1">
                <PenLine size={22} />
                <p className="text-sm">Firma qui col dito o con la penna</p>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Firmando, la firma viene inserita nel documento e registrata con data, ora e indirizzo di
            rete. È una firma elettronica semplice.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <button
              type="button"
              onClick={cancella}
              disabled={vuota || inCorso}
              className="inline-flex items-center justify-center gap-2 px-4 h-11 rounded-lg glass-btn-soft text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-40"
            >
              <Eraser size={16} />
              Cancella
            </button>
            <button
              type="button"
              onClick={conferma}
              disabled={vuota || inCorso}
              className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold disabled:opacity-40"
            >
              {inCorso ? "Salvataggio…" : "Conferma firma"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
