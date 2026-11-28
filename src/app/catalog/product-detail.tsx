"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/locale-provider";

type Product = {
  id: string; sku: string; title: string; description: string | null;
  priceAmount: number; currency: string; condition: string; productType: string;
  categoryName: string | null; brandName: string | null; storeName: string;
  storeDescription: string | null; stock: number;
  images: { key: string; alt: string | null }[];
  attributes: Record<string, unknown>;
};

export function ProductDetail({ product }: { product: Product }) {
  const { currency, formatPrice } = useLocale();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const id = true;
  const imageUrls = product.images.filter((image) => /^https?:\/\//i.test(image.key));
  async function addToCart() {
    setAdding(true);
    setCartMessage("");
    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: product.id, quantity: 1 }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.push(`/sign-in?callbackURL=${encodeURIComponent(`/catalog/${product.id}`)}`);
        return;
      }
      if (!response.ok) throw new Error(data.error || "Gagal menambahkan produk ke keranjang.");
      setCartMessage("Produk berhasil ditambahkan ke keranjang.");
    } catch (error) {
      setCartMessage(error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setAdding(false);
    }
  }

  const price = product.currency === "IDR"
    ? formatPrice(product.priceAmount)
    : new Intl.NumberFormat(currency === "USD" ? "en-US" : "id-ID", { style: "currency", currency: product.currency, maximumFractionDigits: 0 }).format(product.priceAmount);

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-5 py-8 md:grid-cols-2 md:py-14">
      <div>
        <div className="grid aspect-square place-items-center overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200">
          {imageUrls[0] ? (
            // The listing image key must be a public URL to render without the configured R2 public domain.
            <div role="img" aria-label={imageUrls[0].alt ?? product.title} className="h-full w-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${imageUrls[0].key}")` }} />
          ) : <span className="text-6xl font-black tracking-[.2em] text-gray-300">EXGARASI</span>}
        </div>
        {imageUrls.length > 1 ? <div className="mt-3 grid grid-cols-4 gap-3">{imageUrls.slice(1, 5).map((image) => <div key={image.key} role="img" aria-label={image.alt ?? product.title} className="aspect-square rounded-xl border border-gray-200 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${image.key}")` }} />)}</div> : null}
        {product.images.length > 0 && imageUrls.length === 0 ? <p className="mt-3 text-xs text-gray-400">{id ? "Foto tersimpan di penyimpanan produk. Domain publik R2 belum dikonfigurasi untuk menampilkannya." : "Product photos are stored, but the public R2 image domain is not configured yet."}</p> : null}
      </div>
      <div className="flex flex-col">
        <div className="flex flex-wrap gap-2">
          {product.categoryName ? <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{product.categoryName}</span> : null}
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{product.condition === "new" ? (id ? "Baru" : "New") : product.condition === "used" ? (id ? "Bekas" : "Used") : "Refurbished"}</span>
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{product.title}</h1>
        <p className="mt-2 text-sm text-gray-500">{product.brandName ?? product.productType} · SKU {product.sku}</p>
        <p className="mt-7 text-3xl font-bold text-[#008fe8]">{price}</p>
        <p className="mt-2 text-sm text-gray-500">{id ? "Harga mengikuti pilihan mata uang tampilan." : "Price follows your display currency preference."}</p>
        <div className="mt-7 rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{id ? "Ketersediaan" : "Availability"}</p>
          <p className="mt-2 text-sm font-semibold">{product.stock > 0 ? (id ? `Stok tersedia: ${product.stock}` : `In stock: ${product.stock}`) : (id ? "Stok habis" : "Out of stock")}</p>
          <div className="my-4 border-t border-gray-100" />
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{id ? "Penjual" : "Seller"}</p>
          <p className="mt-2 text-sm font-semibold">{product.storeName}</p>
          {product.storeDescription ? <p className="mt-1 text-sm leading-6 text-gray-500">{product.storeDescription}</p> : null}
        </div>
        <h2 className="mt-8 text-sm font-bold">{id ? "Deskripsi produk" : "Product description"}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-600">{product.description || (id ? "Belum ada deskripsi produk." : "No product description yet.")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={addToCart} disabled={adding || product.stock < 1} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#168cf0] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#006fc7] disabled:cursor-not-allowed disabled:bg-gray-300">{adding ? "Menambahkan..." : product.stock < 1 ? "Stok habis" : "Tambah ke keranjang"}</button>
          <Link href="/catalog" className="inline-flex min-h-12 w-fit items-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-800 hover:border-sky-500 hover:text-sky-600">Jelajahi produk lainnya</Link>
        </div>
        {cartMessage ? <p role="status" aria-live="polite" className="mt-3 text-sm text-gray-600">{cartMessage}</p> : null}
      </div>
    </section>
  );
}
