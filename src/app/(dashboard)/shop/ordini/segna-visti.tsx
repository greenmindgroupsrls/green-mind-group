"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { segnaOrdiniVisti } from "./actions";

// Spegne il pallino sul menu quando questa pagina viene aperta.
//
// Il router.refresh() dopo serve a farlo sparire subito: il conteggio vive
// nel guscio dell'applicazione, che altrimenti resterebbe quello di prima
// finche' non si cambia pagina — e un pallino che resta acceso su una
// pagina gia' aperta e' esattamente quello che si voleva evitare.
export function SegnaOrdiniVisti({ attivo }: { attivo: boolean }) {
  const router = useRouter();
  const fatto = useRef(false);

  useEffect(() => {
    if (!attivo || fatto.current) return;
    fatto.current = true;
    segnaOrdiniVisti()
      .then(() => router.refresh())
      .catch(() => {});
  }, [attivo, router]);

  return null;
}
