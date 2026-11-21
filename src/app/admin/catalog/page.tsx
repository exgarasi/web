import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, PackagePlus } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const roles = user.roles as string[];
  if (!roles.includes("admin") && !roles.includes("super_admin")) redirect("/");

  const products = await withAuthenticatedDb(async (tx) => {
    return tx`
      select l.id, l.seller_sku, coalesce(l.title_override,p.title) as title,
        l.price_amount::text as price_amount, l.currency, l.condition::text as condition,
        l.status::text as status, s.name as store_name,
        coalesce(i.available_stock,i.physical_stock-i.reserved_stock,0)::int as stock,
        (select li.object_key from public.listing_images li where li.listing_id=l.id order by li.sort_order,li.created_at limit 1) as image_key
      from public.listings l
      join public.products p on p.id=l.product_id
      join public.stores s on s.id=l.store_id
      left join public.inventories i on i.listing_id=l.id
      order by l.created_at desc limit 100
    `;
  });

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-sky-600"><ArrowLeft size={16}/> Dashboard</Link>
          <span className="text-sm font-black tracking-widest">EXGARASI <span className="text-sky-500">ADMIN</span></span>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#0099ff]">Product management</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Katalog produk</h1><p className="mt-2 text-sm text-gray-500">Kelola listing produk EXGARASI dan partner seller.</p></div>
          <span title="Toko resmi EXGARASI perlu dibuat terlebih dahulu" className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-gray-200 px-5 py-3 text-sm font-bold text-gray-500"><PackagePlus size={17}/> Tambah produk · segera</span>
        </div>
        <div className="mt-7 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><p className="text-sm font-semibold">Daftar listing</p><span className="text-xs text-gray-400">{products.length} listing terbaru · maks. 100</span></div>
          {products.length === 0 ? <div className="px-6 py-16 text-center text-sm text-gray-500">Belum ada listing produk.</div> : (
            <div className="divide-y divide-gray-100">
              {products.map((item) => <div key={String(item.id)} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{String(item.title)}</p><p className="mt-1 text-xs text-gray-400">{String(item.seller_sku)} · {String(item.store_name)}</p></div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-bold">{new Intl.NumberFormat("id-ID",{style:"currency",currency:String(item.currency),maximumFractionDigits:0}).format(Number(item.price_amount))}</span>
                  <span className="text-gray-500">Stok {Number(item.stock??0)}</span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-600">{String(item.status)}</span>
                  <Link href={`/catalog/${String(item.id)}`} className="font-semibold text-sky-600 hover:underline">Lihat</Link>
                </div>
              </div>)}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
