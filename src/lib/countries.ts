export type Country = {
  name: string;
  iso2: string;
  dialCode: string;
};

// Paesi europei, ordinati alfabeticamente per nome italiano.
export const EUROPEAN_COUNTRIES: Country[] = [
  { name: "Albania", iso2: "AL", dialCode: "+355" },
  { name: "Andorra", iso2: "AD", dialCode: "+376" },
  { name: "Austria", iso2: "AT", dialCode: "+43" },
  { name: "Belgio", iso2: "BE", dialCode: "+32" },
  { name: "Bielorussia", iso2: "BY", dialCode: "+375" },
  { name: "Bosnia ed Erzegovina", iso2: "BA", dialCode: "+387" },
  { name: "Bulgaria", iso2: "BG", dialCode: "+359" },
  { name: "Cipro", iso2: "CY", dialCode: "+357" },
  { name: "Città del Vaticano", iso2: "VA", dialCode: "+379" },
  { name: "Croazia", iso2: "HR", dialCode: "+385" },
  { name: "Danimarca", iso2: "DK", dialCode: "+45" },
  { name: "Estonia", iso2: "EE", dialCode: "+372" },
  { name: "Finlandia", iso2: "FI", dialCode: "+358" },
  { name: "Francia", iso2: "FR", dialCode: "+33" },
  { name: "Germania", iso2: "DE", dialCode: "+49" },
  { name: "Grecia", iso2: "GR", dialCode: "+30" },
  { name: "Irlanda", iso2: "IE", dialCode: "+353" },
  { name: "Islanda", iso2: "IS", dialCode: "+354" },
  { name: "Italia", iso2: "IT", dialCode: "+39" },
  { name: "Kosovo", iso2: "XK", dialCode: "+383" },
  { name: "Lettonia", iso2: "LV", dialCode: "+371" },
  { name: "Liechtenstein", iso2: "LI", dialCode: "+423" },
  { name: "Lituania", iso2: "LT", dialCode: "+370" },
  { name: "Lussemburgo", iso2: "LU", dialCode: "+352" },
  { name: "Macedonia del Nord", iso2: "MK", dialCode: "+389" },
  { name: "Malta", iso2: "MT", dialCode: "+356" },
  { name: "Moldavia", iso2: "MD", dialCode: "+373" },
  { name: "Monaco", iso2: "MC", dialCode: "+377" },
  { name: "Montenegro", iso2: "ME", dialCode: "+382" },
  { name: "Norvegia", iso2: "NO", dialCode: "+47" },
  { name: "Paesi Bassi", iso2: "NL", dialCode: "+31" },
  { name: "Polonia", iso2: "PL", dialCode: "+48" },
  { name: "Portogallo", iso2: "PT", dialCode: "+351" },
  { name: "Regno Unito", iso2: "GB", dialCode: "+44" },
  { name: "Repubblica Ceca", iso2: "CZ", dialCode: "+420" },
  { name: "Romania", iso2: "RO", dialCode: "+40" },
  { name: "San Marino", iso2: "SM", dialCode: "+378" },
  { name: "Serbia", iso2: "RS", dialCode: "+381" },
  { name: "Slovacchia", iso2: "SK", dialCode: "+421" },
  { name: "Slovenia", iso2: "SI", dialCode: "+386" },
  { name: "Spagna", iso2: "ES", dialCode: "+34" },
  { name: "Svezia", iso2: "SE", dialCode: "+46" },
  { name: "Svizzera", iso2: "CH", dialCode: "+41" },
  { name: "Ucraina", iso2: "UA", dialCode: "+380" },
  { name: "Ungheria", iso2: "HU", dialCode: "+36" },
];

// Converte un codice ISO 3166-1 alpha-2 (es. "IT") nell'emoji bandiera
// corrispondente componendo i due Regional Indicator Symbol Unicode.
export function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

// members.country è testo libero (nome in italiano, dal dropdown Paese):
// serve per collegarlo all'id (iso2 minuscolo) usato dai path della mappa.
const NAME_TO_ISO2 = new Map(EUROPEAN_COUNTRIES.map((c) => [c.name, c.iso2.toLowerCase()]));

export function countryNameToIso2(name: string): string | null {
  return NAME_TO_ISO2.get(name) ?? null;
}
