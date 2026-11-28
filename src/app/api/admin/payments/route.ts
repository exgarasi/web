import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";
import { getAdminAccess } from "@/lib/admin-permissions";
import { createPaymentProofSignedUrl } from "@/lib/payment-proof-storage";

export const runtime = "nodejs";

export async function GET() {
  const access = await getAdminAccess("payments.verify");
  if (!access) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    const rows = await withAuthenticatedDb(async (tx) => tx`
      select pp.id as proof_id, pp.object_key, pp.mime_type, pp.file_size_bytes,
        pp.created_at as submitted_at, pp.status as proof_status,
        o.id as order_id, o.order_number, o.total_amount, o.currency,
        o.shipping_amount, o.shipping_confirmed_at,
        p.id as payment_id, p.payment_method, p.status as payment_status,
        u.full_name as buyer_name, u.email as buyer_email
      from public.orders o
      join public.payments p on p.order_id=o.id
      join public.users u on u.id=o.buyer_user_id
      left join lateral (
        select proof.id, proof.object_key, proof.mime_type, proof.file_size_bytes,
          proof.created_at, proof.status
        from public.payment_proofs proof
        where proof.order_id=o.id and proof.status='pending'
        order by proof.created_at desc limit 1
      ) pp on true
      where o.status='pending_payment' and p.status='pending'
      order by o.placed_at asc
      limit 100
    `);
    const data = await Promise.all(rows.map(async (row) => ({
      ...row,
      proof_url: row.object_key ? await createPaymentProofSignedUrl(row.object_key, 300) : null,
    })));
    return NextResponse.json({ payments: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin-payments] Queue failed", error);
    return NextResponse.json({ error: "Gagal memuat antrean pembayaran." }, { status: 500 });
  }
}
