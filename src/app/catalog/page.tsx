import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import { LanguageSwitcher, CurrencySwitcher } from "@/components/locale-provider";
import { getDatabase } from "@/db";
import { CatalogGrid, type CatalogProduct } from "./catalog-grid";
import { getCurrentUser } from "@/lib/current-user";
import { AccountHeader } from "@/components/account-header";
import { resolvePublicImageUrl } from "@/lib/image-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; category?: string }>;

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);
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
      imageUrl: resolvePublicImageUrl(row.image_url ? String(row.image_url) : null),
    }));
    categories = categoryRows.map((row) => ({ name: String(row.name), slug: String(row.slug) }));
  } catch (error) {
    console.error("EXGARASI catalog query failed", error);
  } finally {
    await db.close();
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#111318]">
      {user ? (
        <AccountHeader name={user.full_name || "EXGARASI member"} email={user.email} roles={user.roles as string[]} />
      ) : (
      <header className="sticky top-0 z-30 border-b border-[#e9edf2] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111318] text-[13px] font-black tracking-[-.08em] text-white">EX</span><span className="text-[18px] font-black tracking-[.16em]">EXGARASI<span className="text-[#0099ff]">.</span></span></Link>
          <div className="flex items-center gap-2"><LanguageSwitcher/><div className="hidden sm:block"><CurrencySwitcher/></div><Link href="/sign-in" className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full bg-[#111318] px-5 py-2.5 text-[12px] font-bold leading-none !text-white transition hover:bg-[#0099ff]"><span>Masuk</span></Link></div>
        </div>
      </header>
      )}
      <section className="border-b border-[#e9edf2] bg-white">
        <div className="mx-auto max-w-[1440px] px-5 pb-9 pt-8 sm:px-8 sm:pb-12 lg:px-12">
          <Link href="/" className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#8993a1] transition hover:text-[#0099ff]"><ArrowLeft size={13}/> Beranda</Link>
          <div className="mt-7 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div><p className="text-[10px] font-bold tracking-[.25em] text-[#0099ff]">EXGARASI / MARKETPLACE</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Temukan pilihanmu<span className="text-[#0099ff]">.</span></h1><p className="mt-3 max-w-xl text-[13px] leading-6 text-[#7c8796]">Jelajahi diecast, suku cadang, aksesori, dan koleksi otomotif dari EXGARASI Official dan partner pilihan.</p></div>
            <form action="/catalog" className="flex w-full max-w-[460px] items-center rounded-xl border border-[#dfe5eb] bg-[#f8fafc] p-1.5 focus-within:border-[#0099ff] focus-within:bg-white">
              <Search className="ml-3 shrink-0 text-[#9aa4b2]" size={17}/><input name="q" defaultValue={search} placeholder="Cari produk, SKU, atau merek..." className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[12px] outline-none placeholder:text-[#9aa4b2]"/>{category?<input type="hidden" name="category" value={category}/>:null}<button className="rounded-lg bg-[#111318] px-4 py-3 text-[11px] font-bold text-white transition hover:bg-[#0099ff]">Cari</button>
            </form>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#687384]"><SlidersHorizontal size={14} className="text-[#0099ff]"/> Kategori</div>
          <p className="text-[10px] text-[#929cab]">{products.length} produk ditemukan</p>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-2">
          <Link href="/catalog" className={`shrink-0 rounded-full px-4 py-2.5 text-[10px] font-bold transition ${!category ? "bg-[#111318] text-white" : "border border-[#e0e5eb] bg-white text-[#687384] hover:border-[#0099ff] hover:text-[#0099ff]"}`}>Semua produk</Link>
          {categories.map((item) => <Link key={item.slug} href={`/catalog?category=${encodeURIComponent(item.slug)}`} className={`shrink-0 rounded-full px-4 py-2.5 text-[10px] font-bold transition ${category === item.slug ? "bg-[#111318] text-white" : "border border-[#e0e5eb] bg-white text-[#687384] hover:border-[#0099ff] hover:text-[#0099ff]"}`}>{item.name}</Link>)}
        </nav>
        <div className="mt-7 flex items-center justify-between border-b border-[#e6ebf0] pb-4"><div><h2 className="text-lg font-semibold tracking-tight">Katalog pilihan</h2><p className="mt-1 text-[10px] text-[#929cab]">Produk aktif yang telah melalui proses persetujuan</p></div><Link href="/sign-up" className="hidden items-center gap-1.5 text-[10px] font-bold text-[#008fe8] hover:underline sm:inline-flex">Jual di EXGARASI<ArrowUpRight size={13}/></Link></div>
        <CatalogGrid products={products}/>
      </section>
      <footer className="mt-10 border-t border-[#e9edf2] bg-white"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 px-5 py-8 text-[10px] text-[#929cab] sm:flex-row sm:px-8 lg:px-12"><Link href="/" className="font-black tracking-[.18em] text-[#111318]">EXGARASI<span className="text-[#0099ff]">.</span></Link><span>© {new Date().getFullYear()} EXGARASI · Marketplace otomotif.</span></div></footer>
    </main>
  );
}
