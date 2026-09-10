import { getDizionario } from "@/i18n/dizionario";
import { PaginaNonTrovata } from "@/components/pagina-non-trovata";

// Dentro il back office: si vede col menu laterale intorno, cosi' chi ci
// finisce non e' bloccato e riparte da dove vuole.
export default async function NonTrovata() {
  const t = (await getDizionario()).nonTrovata;
  return (
    <PaginaNonTrovata
      titolo={t.titolo}
      spiegazione={t.spiegazione}
      azione={{ href: "/dashboard", etichetta: t.tornaDashboard }}
    />
  );
}
