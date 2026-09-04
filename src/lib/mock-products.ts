import type { Product } from "./products";

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    slug: "vortix-5-anni",
    name: "Vortix + 5 anni di garanzia",
    price: 1390.0,
    description:
      "Vortix è il modo in cui gli scarti alimentari smettono di essere un problema. Potenza silenziosa, design essenziale, installazione che scompare sotto il lavello: nient'altro a cui pensare. Costruito per durare, pensato per l'ambiente. 5 anni di garanzia inclusi, dal primo giorno.",
    image_path: "/products/vortix-5-anni.png",
    active: true,
  },
  {
    id: 2,
    slug: "vortix-8-anni",
    name: "Vortix + 8 anni di garanzia",
    price: 1490.0,
    description:
      "Stesso Vortix. Stessa potenza silenziosa, stesso design essenziale, la stessa missione: trasformare gli scarti in un problema del passato. Per chi preferisce pensarci una volta sola, la garanzia arriva a 8 anni — tre in più, per non doverci più pensare.",
    image_path: "/products/vortix-8-anni.png",
    active: true,
  },
];
