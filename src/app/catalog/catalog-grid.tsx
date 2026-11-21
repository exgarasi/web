"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";

export type CatalogProduct = {
  id: string;
  sku: string;
  title: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  condition: string;
  productType: string;
  categoryName: string | null;
  brandName: string | null;
  storeName: string;
  stock: number;
  imageUrl?: string | null;
};

export function CatalogGrid({ products }: { products: CatalogProduct[] }) {
  const { formatPrice, locale, currency } = useLocale();
  const id = locale === "id";

  if (products.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-xl font-black text-sky-500">EX</div>
        <h2 className="mt-4 text-base font-semibold">{id ? "Belum ada produk yang tersedia" : "No products available yet"}</h2>
        <p className="mt-2 text-sm text-gray-500">{id ? "Produk yang telah disetujui dan aktif akan tampil di sini." : "Approved and active listings will appear here."}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {products.map((product) => (
        <Link key={product.id} href={`/catalog/${product.id}`} className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-200/60">
          <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            {product.imageUrl ? <div role="img" aria-label={product.title} className="h-full w-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${product.imageUrl}")` }} /> : <span className="text-4xl font-black tracking-widest text-gray-300">EX</span>}
          </div>
          <div className="p-3 sm:p-4">
            <div className="flex flex-wrap gap-1.5">
              {product.categoryName ? <span className="rounded-full bg-sky-50 px-2 py-1 text-[9px] font-bold text-sky-700">{product.categoryName}</span> : null}
              <span className="rounded-full bg-gray-100 px-2 py-1 text-[9px] font-semibold text-gray-500">{product.condition === "new" ? (id ? "Baru" : "New") : product.condition === "used" ? (id ? "Bekas" : "Used") : (id ? "Refurbished" : "Refurbished")}</span>
            </div>
            <p className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold leading-5">{product.title}</p>
            <p className="mt-1 truncate text-[10px] text-gray-400">{product.brandName ?? product.sku} · {product.storeName}</p>
            <p className="mt-3 text-sm font-bold text-[#008fe8]">{product.currency === "IDR" ? formatPrice(product.priceAmount) : new Intl.NumberFormat(currency === "USD" ? "en-US" : "id-ID", { style: "currency", currency: product.currency, maximumFractionDigits: 0 }).format(product.priceAmount)}</p>
            <p className="mt-1 text-[10px] text-gray-400">{id ? `Stok tersedia: ${product.stock}` : `Available stock: ${product.stock}`}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
