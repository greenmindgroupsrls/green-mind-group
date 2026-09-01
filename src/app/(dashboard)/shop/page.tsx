import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/current-member";
import { MOCK_PRODUCTS } from "@/lib/mock-products";
import type { Product } from "@/lib/products";
import { AddToCartButton } from "./add-to-cart-button";

function formatEuro(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

// "Vortix + 5 anni di garanzia" -> nome principale "Vortix" + variante
// "5 anni di garanzia" mostrata più piccola sotto.
function splitProductName(name: string): { base: string; variant: string | null } {
  const idx = name.indexOf(" + ");
  if (idx === -1) return { base: name, variant: null };
  return { base: name.slice(0, idx), variant: name.slice(idx + 3) };
}

async function loadProducts(): Promise<Product[]> {
  if (!supabaseConfigured()) return MOCK_PRODUCTS;

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("price", { ascending: true });

  return (data ?? []) as Product[];
}

export default async function ShopPage() {
  const products = await loadProducts();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {products.map((product) => {
        const { base, variant } = splitProductName(product.name);
        return (
          <div
            key={product.id}
            className="group rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <Link href={`/shop/${product.slug}`} className="block">
              <div className="relative aspect-[4/3] bg-gray-50 dark:bg-white/5">
                <Image
                  src={product.image_path}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 400px"
                  className="object-cover"
                />
              </div>
              <div className="px-5 pt-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-accent transition-colors">
                  {base}
                </h2>
                {variant && (
                  <p className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                    + {variant}
                  </p>
                )}
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                  {formatEuro(product.price)}
                </p>
              </div>
            </Link>
            <div className="px-5 pb-5">
              <AddToCartButton product={product} />
            </div>
          </div>
        );
      })}
      {products.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 col-span-2 text-center py-12">
          Nessun prodotto disponibile al momento.
        </p>
      )}
    </div>
  );
}
