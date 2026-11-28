import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";
import { getAdminAccess } from "@/lib/admin-permissions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await getAdminAccess("payments.verify");
  if (!access) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const body = await request.json().catch(() => null) as {
    action?: unknown; proofId?: unknown; orderId?: unknown; shippingAmount?: unknown; note?: unknown;
  } | null;
  const action = body?.action;
  const proofId = typeof body?.proofId === "string" ? body.proofId : "";
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  try {
    if (action === "confirm_shipping") {
      const amount = Number(body?.shippingAmount);
      if (!uuid.test(orderId) || !Number.isSafeInteger(amount) || amount < 0 || amount > 1000000000) {
        return NextResponse.json({ error: "Nominal ongkos kirim tidak valid." }, { status: 400 });
      }
      await withAuthenticatedDb(async (tx) => {
        const updated = await tx`
          update public.orders
          set shipping_amount=${amount},
              total_amount=subtotal_amount-discount_amount+${amount},
              shipping_confirmed_at=now(), updated_at=now()
          where id=${orderId}::uuid and status='pending_payment'
            and (shipping_amount=${amount} or not exists (
              select 1 from public.payment_proofs pp
              where pp.order_id=orders.id and pp.status='pending'
            ))
          returning id
        `;
        if (!updated.length) throw new Error("ORDER_NOT_PENDING_OR_SHIPPING_LOCKED");
        await tx`
          update public.payments
          set amount = (select total_amount from public.orders where id=${orderId}::uuid)
          where order_id=${orderId}::uuid and status='pending'
        `;
        await tx`
          insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,metadata)
          values (${access.user.id}::uuid,'order.shipping_confirmed','order',${orderId}::uuid,
            jsonb_build_object('shipping_amount',${amount}))
        `;
      });
      return NextResponse.json({ success: true });
    }

    if (!uuid.test(proofId) || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ error: "Permintaan verifikasi tidak valid." }, { status: 400 });
    }

    await withAuthenticatedDb(async (tx) => {
      const proofs = await tx`
        select pp.id, pp.order_id, pp.payment_id, pp.status as proof_status,
          p.status as payment_status, p.amount, o.total_amount, o.status as order_status,
          o.shipping_confirmed_at
        from public.payment_proofs pp
        join public.payments p on p.id=pp.payment_id
        join public.orders o on o.id=pp.order_id
        where pp.id=${proofId}::uuid
        for update of pp, p, o
      `;
      const proof = proofs[0];
      if (!proof || proof.proof_status !== "pending" || proof.payment_status !== "pending" || proof.order_status !== "pending_payment") {
        throw new Error("PAYMENT_NOT_REVIEWABLE");
      }
      if (action === "approve") {
        if (!proof.shipping_confirmed_at || Number(proof.amount) !== Number(proof.total_amount)) {
          throw new Error("SHIPPING_NOT_CONFIRMED");
        }
        await tx`update public.payment_proofs set status='accepted', reviewed_by=${access.user.id}::uuid, reviewed_at=now(), review_note=${note || null} where id=${proofId}::uuid`;
        await tx`update public.payments set status='paid', paid_at=now() where id=${proof.payment_id}::uuid and status='pending'`;
        await tx`update public.orders set status='paid', updated_at=now() where id=${proof.order_id}::uuid and status='pending_payment'`;
      } else {
        if (!note) throw new Error("REJECTION_NOTE_REQUIRED");
        await tx`update public.payment_proofs set status='rejected', reviewed_by=${access.user.id}::uuid, reviewed_at=now(), review_note=${note} where id=${proofId}::uuid`;
      }
      await tx`
        insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,metadata)
        values (${access.user.id}::uuid,${action === "approve" ? "payment.proof_approved" : "payment.proof_rejected"},
          'payment_proof',${proofId}::uuid,jsonb_build_object('order_id',${proof.order_id},'note',${note}))
      `;
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const known: Record<string, { status: number; error: string }> = {
      ORDER_NOT_PENDING_OR_SHIPPING_LOCKED: { status: 409, error: "Pesanan sudah diproses atau ongkos kirim tidak dapat diubah setelah bukti pembayaran dikirim." },
      PAYMENT_NOT_REVIEWABLE: { status: 409, error: "Bukti atau pembayaran sudah diproses." },
      SHIPPING_NOT_CONFIRMED: { status: 409, error: "Ongkos kirim belum dikonfirmasi atau total tidak cocok." },
      REJECTION_NOTE_REQUIRED: { status: 400, error: "Alasan penolakan wajib diisi." },
      UNAUTHENTICATED: { status: 401, error: "Silakan masuk kembali." },
    };
    const result = known[message] ?? { status: 500, error: "Gagal memproses verifikasi pembayaran." };
    console.error("[admin-payments] Review failed", message);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
