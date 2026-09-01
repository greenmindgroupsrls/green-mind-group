import { NextRequest, NextResponse } from "next/server";

// Proxy verso Nominatim (OpenStreetMap) per il suggerimento indirizzi —
// gratuito, nessuna chiave API, ma con policy d'uso rigide: serve uno User-
// Agent che identifichi l'app (bloccano richieste anonime) e non si può
// superare 1 richiesta/secondo — qui arriva già "diluita" dal debounce
// lato client, un utente alla volta non si avvicina al limite.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "GreenMindGroup-BackOffice/1.0 (contatto: greenmindgroupsrls@gmail.com)";

type NominatimResult = {
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    hamlet?: string;
    postcode?: string;
    state?: string;
    country_code?: string;
  };
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const countryCode = searchParams.get("country")?.trim().toLowerCase();

  if (q.length < 4) {
    return NextResponse.json({ results: [] });
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    "accept-language": "it",
    limit: "5",
    q,
  });
  if (countryCode) params.set("countrycodes", countryCode);

  try {
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return NextResponse.json({ results: [] });

    const data = (await res.json()) as NominatimResult[];
    const results = data.map((item) => {
      const a = item.address ?? {};
      const street = a.road ? (a.house_number ? `${a.road}, ${a.house_number}` : a.road) : "";
      const city = a.city || a.town || a.village || a.municipality || a.hamlet || "";
      return {
        displayName: item.display_name,
        street,
        city,
        region: a.state || "",
        postalCode: a.postcode || "",
        countryIso2: a.country_code ? a.country_code.toUpperCase() : null,
      };
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
