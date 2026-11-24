"use client";

import Link from "next/link";
import { ArrowUpRight, PackageSearch } from "lucide-react";
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
      <div className="mt-6 rounded-[26px] border border-dashed border-[#d9e1e9] bg-white px-6 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf6ff] text-[#0099ff]"><PackageSearch size={24}/></div>
        <h2 className="mt-5 text-lg font-semibold tracking-tight">{id ? "Belum ada produk yang tersedia" : "No products available yet"}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#8792a1]">{id ? "Produk yang telah disetujui dan aktif akan tampil di sini. Coba kembali nanti." : "Approved and active listings will appear here. Check back soon."}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
      {products.map((product) => (
        <Link key={product.id} href={`/catalog/${product.id}`} className="group overflow-hidden rounded-[20px] border border-[#e7ebf0] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#b9def7] hover:shadow-xl hover:shadow-[#172b42]/[.07]">
          <div className="relative aspect-[1.12] overflow-hidden bg-[#f1f4f7]">
            {product.imageUrl ? <div role="img" aria-label={product.title} className="h-full w-full bg-contain bg-center bg-no-repeat transition duration-500 group-hover:scale-[1.04]" style={{ backgroundImage: `url("${product.imageUrl}")` }} /> : <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_38%,#ffffff_0%,#edf1f5_72%)]"><span className="text-[34px] font-black tracking-[-.08em] text-[#d0d8e1]">EX<span className="text-[#0099ff]/50">.</span></span><span className="mt-2 text-[9px] font-bold tracking-[.2em] text-[#a2adba]">EXGARASI SELECT</span></div>}
            <span className="absolute left-3 top-3 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[9px] font-bold text-[#4b5563] backdrop-blur">{product.condition === "new" ? (id ? "Baru" : "New") : product.condition === "used" ? (id ? "Bekas" : "Used") : "Refurbished"}</span>
            <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#111318] opacity-0 shadow-lg transition group-hover:opacity-100"><ArrowUpRight size={15}/></span>
          </div>
          <div className="p-3.5 sm:p-4">
            <p className="truncate text-[9px] font-bold uppercase tracking-[.14em] text-[#0099ff]">{product.categoryName ?? product.productType}</p>
            <p className="mt-2 line-clamp-2 min-h-10 text-[13px] font-semibold leading-5 text-[#171b22]">{product.title}</p>
            <p className="mt-1.5 truncate text-[10px] text-[#8a94a3]">{product.brandName ?? product.sku} <span className="px-1 text-[#c7ced6]">/</span> {product.storeName}</p>
            <div className="mt-4 flex items-end justify-between gap-2 border-t border-[#eff2f5] pt-3">
              <p className="text-[13px] font-bold tracking-tight text-[#111318]">{product.currency === "IDR" ? formatPrice(product.priceAmount) : new Intl.NumberFormat(currency === "USD" ? "en-US" : "id-ID", { style: "currency", currency: product.currency, maximumFractionDigits: 0 }).format(product.priceAmount)}</p>
              <p className="shrink-0 text-[9px] text-[#9aa3af]">{id ? `Stok ${product.stock}` : `Stock ${product.stock}`}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
