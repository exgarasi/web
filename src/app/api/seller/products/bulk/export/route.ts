import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(storeId))
      return NextResponse.json({ error: "Toko tidak valid." }, { status: 400 });

    const rows = await withAuthenticatedDb(async (tx, appUserId) => {
      const access = await tx`
        select s.id, s.status, sm.member_role
        from public.stores s
        left join public.store_members sm on sm.store_id=s.id and sm.user_id=${appUserId}::uuid
        where s.id=${storeId}::uuid
          and (s.owner_user_id=${appUserId}::uuid or sm.user_id is not null)
        limit 1
      `;
      if (!access.length) throw new Error("FORBIDDEN");
      if (access[0].status !== "active") throw new Error("STORE_NOT_ACTIVE");
      if (access[0].member_role && !["owner", "manager", "catalog_manager"].includes(String(access[0].member_role)))
        throw new Error("FORBIDDEN");

      return tx`
        select l.id as listing_id, l.seller_sku as sku,
          coalesce(l.title_override, p.title) as title,
          coalesce(l.description_override, p.description, '') as description,
          coalesce(c.name, '') as category, coalesce(b.name, '') as brand,
          coalesce(p.attributes->>'details', '') as details,
          coalesce(p.attributes->>'series', '') as series,
          coalesce(p.attributes->>'model', '') as model,
          coalesce(p.attributes->>'year', '') as year,
          l.condition::text as condition, l.price_amount as price,
          l.currency, coalesce(i.available_stock, i.physical_stock, 0) as stock,
          coalesce(array_agg(li.object_key order by li.sort_order) filter (where li.object_key is not null), '{}') as image_keys
        from public.listings l
        join public.products p on p.id=l.product_id
        left join public.categories c on c.id=p.category_id
        left join public.brands b on b.id=p.brand_id
        left join public.inventories i on i.listing_id=l.id
        left join public.listing_images li on li.listing_id=l.id
        where l.store_id=${storeId}::uuid
        group by l.id,p.id,c.id,b.id,i.listing_id,i.available_stock,i.physical_stock
        order by l.created_at desc
      `;
    });

    const base = (process.env.R2_PUBLIC_BASE_URL ?? "https://media.exgarasi.id").replace(/\/$/, "");
    const headers = ["listing_id","title","description","details","category","sku","brand","series","model","year","condition","price","currency","stock","image_1","image_2","image_3","image_4","image_5"];
    const lines = [headers.join(",")];
    for (const row of rows) {
      const keys = Array.isArray(row.image_keys) ? row.image_keys as string[] : [];
      const images = Array.from({ length: 5 }, (_, index) => keys[index] ? `${base}/${keys[index].split("/").map(encodeURIComponent).join("/")}` : "");
      const values = [
        row.listing_id,row.title,row.description,row.details,row.category,row.sku,row.brand,
        row.series,row.model,row.year,row.condition,row.price,row.currency,row.stock,...images,
      ];
      lines.push(values.map(csvCell).join(","));
    }

    return new Response("\uFEFF" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exgarasi-products-${storeId}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export CSV gagal.";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : message === "STORE_NOT_ACTIVE" ? 409 : 500;
    return NextResponse.json({ error: status === 500 ? "Terjadi kesalahan saat mengekspor produk." : message }, { status });
  }
}
