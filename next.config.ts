import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Il sito VORTIX e' il sito principale: vive in public/ ed e' quello che
// trova chi scrive greenmindgroup.pro. Il back office sta sotto lo stesso
// dominio ma si entra da /login, e la sua schermata iniziale e' /dashboard.
//
// Le pagine sono HTML statico dentro public/, quindi rispondono gia' al loro
// nome-file (/sondaggio.html). Le rewrite qui sotto servono a dargli anche
// l'indirizzo pulito senza estensione, che e' quello che pubblichiamo.
const PAGINE_SITO = [
  { pulito: "/", file: "/index.html" },
  { pulito: "/sondaggio", file: "/sondaggio.html" },
  { pulito: "/disclaimer", file: "/disclaimer.html" },
  { pulito: "/termini-greenmindgroup", file: "/termini-greenmindgroup.html" },
  { pulito: "/privacy-greenmindgroup", file: "/privacy-greenmindgroup.html" },
];

const nextConfig: NextConfig = {
  async rewrites() {
    return PAGINE_SITO.map(({ pulito, file }) => ({ source: pulito, destination: file }));
  },

  // Il sito stava sotto /company/: quei link sono gia' in giro — nelle email
  // dei coupon, nel link per prenotare, in qualunque cosa sia stata
  // condivisa. I redirect vengono valutati PRIMA del proxy (vedi l'ordine di
  // routing nella documentazione di Next), quindi chi apre un vecchio link
  // arriva alla pagina nuova senza passare dalla richiesta di accesso.
  async redirects() {
    return [
      // Lo slash finale lo toglie gia' Next da solo prima di arrivare qui,
      // quindi "/company/" passa comunque da questa riga.
      { source: "/company", destination: "/", permanent: true },
      { source: "/company/index.html", destination: "/", permanent: true },
      { source: "/company/sondaggio.html", destination: "/sondaggio", permanent: true },
      { source: "/company/disclaimer.html", destination: "/disclaimer", permanent: true },
      { source: "/company/termini.html", destination: "/termini-greenmindgroup", permanent: true },
      { source: "/company/privacy.html", destination: "/privacy-greenmindgroup", permanent: true },
      // Immagini, fogli di stile, video e modello 3D: tutto quello che stava
      // sotto /company/ ora sta allo stesso percorso senza quel prefisso.
      { source: "/company/:percorso*", destination: "/:percorso*", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
