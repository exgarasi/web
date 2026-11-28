import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { listingId?: unknown; quantity?: unknown } | null;
  const listingId = typeof body?.listingId === "string" ? body.listingId : "";
  const quantity = Number(body?.quantity ?? 1);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listingId)
    || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return NextResponse.json({ error: "Produk atau jumlah tidak valid." }, { status: 400 });
  }

  try {
    const result = await withAuthenticatedDb(async (tx, appUserId) => {
      const listings = await tx`
        select l.id, coalesce(i.available_stock, i.physical_stock - i.reserved_stock, 0)::int as stock
        from public.listings l
        join public.products p on p.id=l.product_id
        join public.stores s on s.id=l.store_id
        left join public.inventories i on i.listing_id=l.id
        where l.id=${listingId}::uuid and l.status='active'
          and s.status='active' and p.moderation_status='approved'
        for update of l
      `;
      if (!listings.length) throw new Error("PRODUCT_UNAVAILABLE");
      const stock = Number(listings[0].stock ?? 0);
      if (stock < 1) throw new Error("OUT_OF_STOCK");

      const carts = await tx`
        select id from public.carts
        where user_id=${appUserId}::uuid
          and status='active'
        order by created_at desc limit 1 for update
      `;
      const cart = carts[0] ?? (await tx`
        insert into public.carts(user_id,status)
        values(public.app_current_user_id(),'active') returning id
      `)[0];
      const existing = await tx`
        select id, quantity from public.cart_items
        where cart_id=${cart.id}::uuid and listing_id=${listingId}::uuid
        for update
      `;
      const nextQuantity = Number(existing[0]?.quantity ?? 0) + quantity;
      if (nextQuantity > stock) throw new Error("INSUFFICIENT_STOCK");
      if (existing.length) {
        await tx`update public.cart_items set quantity=${nextQuantity} where id=${existing[0].id}::uuid`;
      } else {
        await tx`insert into public.cart_items(cart_id,listing_id,quantity) values(${cart.id}::uuid,${listingId}::uuid,${quantity})`;
      }
      const count = await tx`select coalesce(sum(quantity),0)::int as item_count from public.cart_items where cart_id=${cart.id}::uuid`;
      return { cartId: String(cart.id), itemCount: Number(count[0].item_count), quantity: nextQuantity };
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan produk ke keranjang.";
    const status = message === "UNAUTHENTICATED" ? 401
      : message === "PRODUCT_UNAVAILABLE" ? 404
      : ["OUT_OF_STOCK", "INSUFFICIENT_STOCK"].includes(message) ? 409 : 500;
    return NextResponse.json({ error: message === "PRODUCT_UNAVAILABLE" ? "Produk tidak tersedia." : message === "OUT_OF_STOCK" ? "Stok produk habis." : message === "INSUFFICIENT_STOCK" ? "Jumlah melebihi stok yang tersedia." : message }, { status });
  }
}
