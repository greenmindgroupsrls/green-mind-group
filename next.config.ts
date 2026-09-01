import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Monta il sito Vortix (progetto Vercel separato, HTML statico con path
// relativi tipo "css/style.css") sotto /company. Il redirect a "/company/"
// (con slash finale) è necessario: senza, i path relativi della pagina
// risolverebbero contro la radice del dominio invece che contro /company/,
// e css/js/immagini non si caricherebbero più.
const VORTIX_ORIGIN = "https://sito-three-eosin.vercel.app";

const nextConfig: NextConfig = {
  // Il redirect /company -> /company/ (aggiunto in proxy.ts) va in loop
  // infinito con la normalizzazione automatica di Next (che di default fa
  // l'esatto opposto, toglie lo slash finale) — va disattivata qui e gestita
  // a mano, come da guida ufficiale per questo genere di mount.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [{ source: "/company/:path*", destination: `${VORTIX_ORIGIN}/:path*` }];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
