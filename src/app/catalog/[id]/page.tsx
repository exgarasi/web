import Link from "next/link";
import { notFound } from "next/navigation";
import { getDatabase } from "@/db";
import { ProductDetail } from "../product-detail";
import { getCurrentUser } from "@/lib/current-user";
import { AccountHeader } from "@/components/account-header";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProductPage({ params }: Props) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const db = await getDatabase();
  let product: {
    id: string; sku: string; title: string; description: string | null;
    priceAmount: number; currency: string; condition: string; productType: string;
    categoryName: string | null; brandName: string | null; storeName: string;
    storeDescription: string | null; stock: number; images: { key: string; alt: string | null }[];
    attributes: Record<string, unknown>;
  } | null = null;
  try {
    const rows = await db.sql`
      select l.id, l.seller_sku, coalesce(l.title_override, p.title) as title,
        coalesce(l.description_override, p.description) as description,
        l.price_amount::text as price_amount, l.currency, l.condition::text as condition,
        p.product_type, p.attributes as product_attributes, l.attributes as listing_attributes,
        c.name as category_name, b.name as brand_name, s.name as store_name,
        s.description as store_description,
        coalesce(i.available_stock, i.physical_stock - i.reserved_stock, 0)::int as stock
      from public.listings l
      join public.products p on p.id = l.product_id
      join public.stores s on s.id = l.store_id
      left join public.categories c on c.id = p.category_id
      left join public.brands b on b.id = p.brand_id
      left join public.inventories i on i.listing_id = l.id
      where l.id = ${id}::uuid and l.status = 'active' and s.status = 'active'
        and p.moderation_status = 'approved'
      limit 1
    `;
    if (rows.length) {
      const row = rows[0];
      const imageRows = await db.sql`
        select object_key, alt_text from public.listing_images
        where listing_id = ${id}::uuid order by sort_order asc, created_at asc
      `;
      product = {
        id: String(row.id), sku: String(row.seller_sku), title: String(row.title),
        description: row.description ? String(row.description) : null,
        priceAmount: Number(row.price_amount), currency: String(row.currency),
        condition: String(row.condition), productType: String(row.product_type),
        categoryName: row.category_name ? String(row.category_name) : null,
        brandName: row.brand_name ? String(row.brand_name) : null,
        storeName: String(row.store_name),
        storeDescription: row.store_description ? String(row.store_description) : null,
        stock: Number(row.stock ?? 0),
        images: imageRows.map((image) => ({ key: String(image.object_key), alt: image.alt_text ? String(image.alt_text) : null })),
        attributes: { ...(row.product_attributes as Record<string, unknown> ?? {}), ...(row.listing_attributes as Record<string, unknown> ?? {}) },
      };
    }
  } finally {
    await db.close();
  }

  if (!product) notFound();

  return (
    <main className="min-h-screen bg-[#f8fafc] text-gray-950">
      {user ? (
        <AccountHeader name={user.full_name || "EXGARASI member"} email={user.email} roles={user.roles as string[]} />
      ) : (
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-xl font-black tracking-[.2em]">EXGARASI<span className="text-sky-500">.</span></Link>
          <Link href="/catalog" className="text-sm font-semibold text-gray-600 hover:text-sky-600">← Kembali ke katalog</Link>
        </div>
      </header>
      )}
      <ProductDetail product={product} />
    </main>
  );
}
