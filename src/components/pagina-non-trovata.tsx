import Link from "next/link";
import { Compass } from "lucide-react";
import { MarchioCompleto } from "./marchio";

// Il 404 e' l'unica pagina che vedono due persone molto diverse: chi ha
// sbagliato a scrivere un indirizzo, e chi ha provato ad aprire una pagina
// che non gli spetta. Deve dire la stessa identica cosa a tutti e due —
// se al secondo dicesse "non sei autorizzato" gli confermerebbe che la
// pagina esiste, che e' esattamente cio' che non vogliamo.
export function PaginaNonTrovata({
  titolo,
  spiegazione,
  azione,
  marchio = false,
}: {
  titolo: string;
  spiegazione: string;
  azione: { href: string; etichetta: string };
  // Fuori dal back office non c'e' la barra laterale a dire dove siamo:
  // li' il marchio serve, dentro sarebbe un doppione.
  marchio?: boolean;
}) {
  return (
    <div className="p-4 sm:p-8 flex justify-center">
      <div className="w-full max-w-md flex flex-col items-center text-center mt-6 sm:mt-16">
        {marchio && (
          <MarchioCompleto className="h-auto w-[170px] mb-8" priority />
        )}

        <div className="glass-card p-6 sm:p-8 w-full flex flex-col items-center gap-4">
          <span
            aria-hidden="true"
            className="h-14 w-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center"
          >
            <Compass size={26} />
          </span>

          <div>
            {/* Misurato: in grigio chiaro stava a 1,16:1 sul vetro, cioe'
                non si leggeva. Questo tono lo tiene defilato rispetto al
                titolo ma sopra la soglia per il testo grande. */}
            <p className="text-4xl font-semibold text-gray-500 dark:text-gray-400 tabular-nums leading-none">
              404
            </p>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white mt-3">{titolo}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              {spiegazione}
            </p>
          </div>

          <Link
            href={azione.href}
            className="glass-btn-primary rounded-lg px-4 h-10 inline-flex items-center text-sm font-medium mt-1"
          >
            {azione.etichetta}
          </Link>
        </div>
      </div>
    </div>
  );
}
