import { CheckoutForm, type DatiSalvati } from "./checkout-form";
import { pagamentiOnlineAttivi } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import type { DatiIndirizzo } from "@/components/blocco-indirizzo";

export const dynamic = "force-dynamic";

const VUOTI: DatiSalvati = {
  intestatario: "",
  codiceFiscale: "",
  codiceSdi: "",
  destinatario: "",
  telefono: "",
  fatturazione: null,
  spedizione: null,
};

type Riga = {
  recipient_name: string;
  street: string;
  city: string;
  region: string | null;
  country: string;
  postal_code: string;
  phone: string | null;
  type: string;
  created_at: string;
};

function daRiga(r: Riga | undefined): DatiIndirizzo | null {
  if (!r) return null;
  return {
    paese: r.country,
    via: r.street,
    citta: r.city,
    provincia: r.region ?? "",
    cap: r.postal_code,
  };
}

// Chi ha gia' premuto "salva dati" una volta trova il modulo compilato.
// Si prendono i piu' recenti per tipo: se uno ha traslocato, l'ultimo
// salvato e' quello giusto.
async function caricaDatiSalvati(): Promise<DatiSalvati> {
  if (!supabaseConfigured()) return VUOTI;
  const membro = await getCurrentMember();
  if (!membro) return VUOTI;

  const supabase = await createClient();
  const [{ data: profilo }, { data: indirizzi }] = await Promise.all([
    supabase
      .from("member_profiles")
      .select("tax_id, sdi_code, company_name")
      .eq("activity_code", membro.activity_code)
      .maybeSingle(),
    supabase
      .from("member_addresses")
      .select("recipient_name, street, city, region, country, postal_code, phone, type, created_at")
      .eq("activity_code", membro.activity_code)
      .order("created_at", { ascending: false }),
  ]);

  const righe = (indirizzi ?? []) as Riga[];
  const fatturazione = righe.find((r) => r.type === "billing");
  const spedizione = righe.find((r) => r.type === "shipping");

  return {
    intestatario: fatturazione?.recipient_name ?? profilo?.company_name ?? "",
    codiceFiscale: profilo?.tax_id ?? "",
    codiceSdi: profilo?.sdi_code ?? "",
    destinatario: spedizione?.recipient_name ?? "",
    telefono: spedizione?.phone ?? fatturazione?.phone ?? "",
    fatturazione: daRiga(fatturazione),
    spedizione: daRiga(spedizione),
  };
}

export default async function CheckoutPage() {
  // La chiave di Stripe si legge solo lato server: al modulo arriva un
  // sì/no, non la chiave.
  return <CheckoutForm pagamentoAttivo={pagamentiOnlineAttivi()} dati={await caricaDatiSalvati()} />;
}
