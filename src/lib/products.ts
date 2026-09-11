export type Product = {
  id: number;
  slug: string;
  // Codice di magazzino (GMGV005, GMGV008): compare negli ordini al
  // posto del nome, per chi prepara le spedizioni.
  code: string;
  name: string;
  price: number;
  description: string;
  image_path: string;
  active: boolean;
};
