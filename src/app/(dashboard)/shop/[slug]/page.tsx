import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/current-member";
import { MOCK_PRODUCTS } from "@/lib/mock-products";
import type { Product } from "@/lib/products";
import { AddToCart } from "./add-to-cart";

function formatEuro(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

async function loadProduct(slug: string): Promise<Product | null> {
  if (!supabaseConfigured()) {
    return MOCK_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  return (data as Product | null) ?? null;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
        <Image
          src={product.image_path}
          alt={product.name}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
      <div className="flex flex-col">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{product.name}</h1>
        <p className="text-xl font-bold text-accent mt-2">{formatEuro(product.price)}</p>
        <p className="text-gray-600 dark:text-gray-300 mt-4 leading-relaxed">
          {product.description}
        </p>
        <div className="mt-6">
          <AddToCart product={product} />
        </div>
      </div>
    </div>
  );
}
