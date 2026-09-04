import { NextResponse } from "next/server";
import dati from "@/data/comuni-italiani.json";

// Elenchi ufficiali di regioni, province e comuni italiani con i relativi
// CAP, usati dal modulo di prenotazione del sito (public/company).
//
// Stanno qui e non dentro la pagina per un motivo di peso: il file completo
// e' 271 KB, e caricarlo tutto per far scegliere un comune sarebbe uno
// spreco. Cosi' la pagina scarica l'elenco delle province (pochi KB) e poi
// solo i comuni della provincia scelta.
//
// I dati non cambiano mai durante la vita del processo: si possono tenere
// in cache a lungo senza rischi.

type Comune = { n: string; c: string[] };
type Dati = {
  regioni: Record<string, string[]>;
  province: Record<string, string>;
  comuni: Record<string, Comune[]>;
};

const CACHE = "public, max-age=86400, stale-while-revalidate=604800";

export async function GET(request: Request) {
  const d = dati as Dati;
  const provincia = new URL(request.url).searchParams.get("provincia");

  // Senza parametri: regioni e province, cioe' quanto basta per riempire le
  // prime due tendine.
  if (!provincia) {
    return NextResponse.json(
      { regioni: d.regioni, province: d.province },
      { headers: { "Cache-Control": CACHE } },
    );
  }

  const sigla = provincia.toUpperCase();
  const comuni = d.comuni[sigla];
  if (!comuni) {
    return NextResponse.json({ error: "Provincia sconosciuta" }, { status: 404 });
  }

  return NextResponse.json({ comuni }, { headers: { "Cache-Control": CACHE } });
}
