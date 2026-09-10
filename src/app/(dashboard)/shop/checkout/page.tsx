import { CheckoutForm } from "./checkout-form";
import { pagamentiOnlineAttivi } from "@/lib/stripe";

export default function CheckoutPage() {
  // La chiave di Stripe si legge solo lato server: al modulo arriva un
  // sì/no, non la chiave.
  return <CheckoutForm pagamentoAttivo={pagamentiOnlineAttivi()} />;
}
