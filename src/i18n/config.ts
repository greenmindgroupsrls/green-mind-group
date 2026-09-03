// Lingue del back office. L'italiano e' la lingua di partenza: i testi
// originali sono scritti in italiano e le altre lingue sono traduzioni.
export const LINGUE = ["it", "en", "fr", "es", "de", "ru"] as const;

export type Lingua = (typeof LINGUE)[number];

export const LINGUA_PREDEFINITA: Lingua = "it";

// Nome nella propria lingua, non nella nostra: chi cerca il tedesco cerca
// "Deutsch", non "Tedesco".
export const NOME_LINGUA: Record<Lingua, string> = {
  it: "Italiano",
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  ru: "Русский",
};

export const BANDIERA: Record<Lingua, string> = {
  it: "🇮🇹",
  en: "🇬🇧",
  fr: "🇫🇷",
  es: "🇪🇸",
  de: "🇩🇪",
  ru: "🇷🇺",
};

export const COOKIE_LINGUA = "lingua";

export function isLingua(v: string | undefined | null): v is Lingua {
  return typeof v === "string" && (LINGUE as readonly string[]).includes(v);
}

// Sceglie la lingua leggendo l'intestazione che il browser manda a ogni
// richiesta (es. "fr-FR,fr;q=0.9,en;q=0.8"). Serve solo al primo accesso:
// dopo, vale la scelta salvata nel cookie.
export function linguaDaBrowser(acceptLanguage: string | null): Lingua {
  if (!acceptLanguage) return LINGUA_PREDEFINITA;

  const preferite = acceptLanguage
    .split(",")
    .map((pezzo) => {
      const [codice, q] = pezzo.trim().split(";q=");
      return { codice: codice.trim().toLowerCase(), peso: q ? Number(q) : 1 };
    })
    .filter((x) => !Number.isNaN(x.peso))
    .sort((a, b) => b.peso - a.peso);

  for (const { codice } of preferite) {
    const base = codice.split("-")[0];
    if (isLingua(base)) return base;
  }

  return LINGUA_PREDEFINITA;
}
