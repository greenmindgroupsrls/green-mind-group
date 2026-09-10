import { getDizionario } from "@/i18n/dizionario";
import { PaginaNonTrovata } from "@/components/pagina-non-trovata";

// Fuori dal back office non c'e' barra laterale ne' intestazione: qui il
// marchio e' l'unica cosa che dice dove si e' finiti, e la via d'uscita e'
// il sito pubblico, non la dashboard (che richiederebbe l'accesso).
export default async function NonTrovata() {
  const t = (await getDizionario()).nonTrovata;
  return (
    <div className="min-h-[100dvh] bg-background flex items-start justify-center">
      <PaginaNonTrovata
        marchio
        titolo={t.titolo}
        spiegazione={t.spiegazione}
        azione={{ href: "/", etichetta: t.tornaSito }}
      />
    </div>
  );
}
