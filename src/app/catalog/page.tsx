import Link from "next/link";
import { getDatabase } from "@/db";
import { CatalogGrid, type CatalogProduct } from "./catalog-grid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; category?: string }>;

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = (params.q ?? "").trim().slice(0, 80);
  const category = (params.category ?? "").trim().slice(0, 80);
  const db = await getDatabase();

  let products: CatalogProduct[] = [];
  let categories: { name: string; slug: string }[] = [];
  try {
    const [rows, categoryRows] = await Promise.all([
      db.sql`
        select l.id, l.seller_sku, coalesce(l.title_override, p.title) as title,
          coalesce(l.description_override, p.description) as description,
          l.price_amount::text as price_amount, l.currency,
          l.condition::text as condition, l.attributes as listing_attributes,
          p.product_type, c.name as category_name, c.slug as category_slug,
          b.name as brand_name, s.name as store_name,
          coalesce(i.available_stock, i.physical_stock - i.reserved_stock, 0)::int as stock,
          (select li.object_key from public.listing_images li where li.listing_id = l.id order by li.sort_order asc, li.created_at asc limit 1) as image_url
        from public.listings l
        join public.products p on p.id = l.product_id
        join public.stores s on s.id = l.store_id
        left join public.categories c on c.id = p.category_id
        left join public.brands b on b.id = p.brand_id
        left join public.inventories i on i.listing_id = l.id
        where l.status = 'active' and s.status = 'active'
          and p.moderation_status = 'approved'
          and (${search} = '' or coalesce(l.title_override, p.title) ilike ${'%' + search + '%'}
            or l.seller_sku ilike ${'%' + search + '%'}
            or coalesce(b.name, '') ilike ${'%' + search + '%'})
          and (${category} = '' or c.slug = ${category})
        order by l.created_at desc
        limit 48
      `,
      db.sql`
        select name, slug from public.categories
        where is_active = true and vertical = 'automotive'
        order by sort_order, name
      `,
    ]);
    products = rows.map((row) => ({
      id: String(row.id),
      sku: String(row.seller_sku),
      title: String(row.title),
      description: row.description ? String(row.description) : null,
      priceAmount: Number(row.price_amount),
      currency: String(row.currency),
      condition: String(row.condition),
      productType: String(row.product_type),
      categoryName: row.category_name ? String(row.category_name) : null,
      brandName: row.brand_name ? String(row.brand_name) : null,
      storeName: String(row.store_name),
      stock: Number(row.stock ?? 0),
      imageUrl: row.image_url && /^https?:\/\//i.test(String(row.image_url)) ? String(row.image_url) : null,
    }));
    categories = categoryRows.map((row) => ({ name: String(row.name), slug: String(row.slug) }));
  } catch (error) {
    console.error("EXGARASI catalog query failed", error);
  } finally {
    await db.close();
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-xl font-black tracking-[.2em]">EXGARASI<span className="text-sky-500">.</span></Link>
          <Link href="/" className="text-sm font-semibold text-gray-600 hover:text-sky-600">Kembali ke beranda</Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-[#0099ff]">EXGARASI Marketplace</p>
        <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Katalog otomotif</h1>
            <p className="mt-2 max-w-xl text-sm text-gray-500">Temukan diecast, suku cadang, aksesori, dan koleksi pilihan dari EXGARASI dan partner.</p>
          </div>
          <form action="/catalog" className="flex w-full max-w-md gap-2">
            <input name="q" defaultValue={search} placeholder="Cari produk, SKU, atau merek..." className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-sky-500" />
            {category ? <input type="hidden" name="category" value={category} /> : null}
            <button className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-600">Cari</button>
          </form>
        </div>
        <nav className="mt-8 flex gap-2 overflow-x-auto pb-2">
          <Link href="/catalog" className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${!category ? "bg-gray-950 text-white" : "border border-gray-200 bg-white text-gray-600"}`}>Semua</Link>
          {categories.map((item) => (
            <Link key={item.slug} href={`/catalog?category=${encodeURIComponent(item.slug)}`} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${category === item.slug ? "bg-gray-950 text-white" : "border border-gray-200 bg-white text-gray-600"}`}>{item.name}</Link>
          ))}
        </nav>
        <div className="mt-7 flex items-center justify-between">
          <p className="text-sm font-semibold">{products.length} produk ditemukan</p>
          <p className="text-xs text-gray-400">Menampilkan maksimal 48 produk</p>
        </div>
        <CatalogGrid products={products} />
      </section>
    </main>
  );
}
