import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await withAuthenticatedDb(async (tx, userId) => {
      const [addresses, cart] = await Promise.all([
        tx`
          select id, recipient_name, phone, address_line, village, district,
            city, province, postal_code, country_code, is_default
          from public.addresses
          where user_id = ${userId}::uuid
          order by is_default desc, created_at desc
        `,
        tx`
          select count(*)::int as item_count,
            coalesce(sum(ci.quantity * l.price_amount), 0)::text as subtotal,
            min(l.currency)::text as currency,
            count(distinct l.currency)::int as currency_count,
            bool_and(l.status = 'active' and p.moderation_status = 'approved' and s.status = 'active') as available
          from public.carts c
          join public.cart_items ci on ci.cart_id = c.id
          join public.listings l on l.id = ci.listing_id
          join public.products p on p.id = l.product_id
          join public.stores s on s.id = l.store_id
          where c.user_id = ${userId}::uuid and c.status = 'active'
        `,
      ]);
      return { addresses, cart: cart[0] ?? { item_count: 0, subtotal: "0", currency: null, currency_count: 0, available: false } };
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat checkout.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    addressId?: unknown;
    paymentMethod?: unknown;
    idempotencyKey?: unknown;
  } | null;
  const addressId = typeof body?.addressId === "string" ? body.addressId : "";
  const paymentMethod = body?.paymentMethod === "manual_qris" ? "manual_qris"
    : body?.paymentMethod === "manual_bank_transfer" ? "manual_bank_transfer" : "";
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "";
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(addressId) || !paymentMethod || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    return NextResponse.json({ error: "Data checkout tidak valid." }, { status: 400 });
  }

  try {
    const result = await withAuthenticatedDb(async (tx) => {
      const rows = await tx`
        select public.create_order_from_cart(
          ${addressId}::uuid,
          ${paymentMethod}::text,
          ${idempotencyKey}::text
        ) as order_data
      `;
      return orderData;
    });
    return NextResponse.json({ success: true, order: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat pesanan.";
    const known: Record<string, { status: number; message: string }> = {
      UNAUTHENTICATED: { status: 401, message: "Silakan masuk terlebih dahulu." },
      ADDRESS_NOT_FOUND: { status: 404, message: "Alamat pengiriman tidak ditemukan." },
      CART_EMPTY: { status: 400, message: "Keranjang belanja kosong." },
      CART_EMPTY_OR_UNAVAILABLE: { status: 409, message: "Produk di keranjang sudah tidak tersedia." },
      INSUFFICIENT_STOCK: { status: 409, message: "Stok produk tidak mencukupi." },
      MIXED_CURRENCY_CART: { status: 409, message: "Pisahkan produk IDR dan USD menjadi transaksi berbeda." },
      COMMISSION_RULE_MISSING: { status: 409, message: "Komisi toko belum dikonfigurasi. Hubungi admin EXGARASI." },
      INVALID_PAYMENT_METHOD: { status: 400, message: "Metode pembayaran tidak valid." },
      INVALID_IDEMPOTENCY_KEY: { status: 400, message: "Kunci transaksi tidak valid." },
    };
    const code = Object.keys(known).find((key) => message.includes(key));
    const mapped = code ? known[code] : { status: 500, message: "Terjadi kesalahan saat membuat pesanan." };
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
