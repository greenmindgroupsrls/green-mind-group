import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Il sito Vortix vive in public/company: e' HTML statico servito da noi, non
// piu' un rinvio a un progetto Vercel separato. Una cosa sola da pubblicare,
// una sola da salvare nei backup, una sola cronologia.
//
// Lo slash finale resta necessario: le pagine usano path relativi tipo
// "css/style.css", che senza "/company/" risolverebbero contro la radice del
// dominio. Il redirect /company -> /company/ e' in proxy.ts.
const nextConfig: NextConfig = {
  // Il redirect a "/company/" va in loop infinito con la normalizzazione
  // automatica di Next (che di default fa l'esatto opposto, toglie lo slash
  // finale): va disattivata qui e gestita a mano.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    // I file dentro public/ si servono al loro percorso esatto: "/company/"
    // da solo non trova nulla, va indirizzato all'indice a mano.
    return [{ source: "/company/", destination: "/company/index.html" }];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
