import { CartProvider } from "@/lib/cart-context";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { ShopHeader } from "./shop-header";

export default async function ShopLayout({ children }: LayoutProps<"/shop">) {
  const member = await getCurrentMember();
  // In demo mode (Supabase non collegato) ci si comporta come l'azienda,
  // stesso pattern già usato altrove (Dashboard, Payout) per poter
  // verificare visivamente le viste riservate all'azienda.
  const isRoot = !supabaseConfigured() || member?.activity_code === 0;

  return (
    <CartProvider>
      <div className="p-8">
        <ShopHeader isRoot={isRoot} />
        <div className="mt-6">{children}</div>
      </div>
    </CartProvider>
  );
}
