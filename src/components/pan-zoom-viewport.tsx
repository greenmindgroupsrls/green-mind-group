"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Plus, Minus, Maximize2 } from "lucide-react";

const MIN_SCALE = 0.4;
const MAX_SCALE = 2.5;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

export function PanZoomViewport({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    captured: boolean;
  } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      setScale((s) => clampScale(s - e.deltaY * 0.0015));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    // Non catturiamo subito il puntatore: se lo facessimo qui, anche un
    // semplice click su un nodo dell'albero (senza alcuno spostamento)
    // verrebbe "rubato" da questo contenitore e il bottone del nodo non
    // riceverebbe mai il click. Catturiamo solo in handlePointerMove, dopo
    // aver superato una soglia minima di movimento — così un click resta
    // un click, e solo un vero trascinamento avvia il pan.
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
      captured: false,
    };
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (!dragState.current.captured) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      e.currentTarget.setPointerCapture(dragState.current.pointerId);
      dragState.current.captured = true;
      setDragging(true);
    }
    setOffset({ x: dragState.current.originX + dx, y: dragState.current.originY + dy });
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (dragState.current?.captured) {
      e.currentTarget.releasePointerCapture(dragState.current.pointerId);
    }
    dragState.current = null;
    setDragging(false);
  }

  function zoomBy(delta: number) {
    setScale((s) => clampScale(s + delta));
  }

  function reset() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  return (
    <div className="relative">
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`relative h-[65vh] min-h-[420px] overflow-hidden touch-none select-none rounded-lg ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          className="absolute inset-0 flex flex-col items-center"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "50% 0%",
          }}
        >
          {/* Spinge la radice a ~1/4 dall'alto, lasciando il resto sotto per l'albero */}
          <div style={{ flex: "0 0 18%" }} aria-hidden />
          <div className="px-8 pb-8">{children}</div>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 flex flex-col gap-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1836] shadow-sm p-1">
        <button
          type="button"
          onClick={() => zoomBy(0.2)}
          className="h-8 w-8 flex items-center justify-center rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
          aria-label="Aumenta zoom"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(-0.2)}
          className="h-8 w-8 flex items-center justify-center rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
          aria-label="Riduci zoom"
        >
          <Minus size={16} />
        </button>
        <button
          type="button"
          onClick={reset}
          className="h-8 w-8 flex items-center justify-center rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
          aria-label="Reimposta vista"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      <p className="absolute top-3 left-3 text-[11px] text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-white/10 backdrop-blur-md rounded px-2 py-1">
        Trascina per spostarti · rotellina per zoom
      </p>
    </div>
  );
}
