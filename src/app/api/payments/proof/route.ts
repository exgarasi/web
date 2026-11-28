import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";
import { deletePaymentProofObject, uploadPaymentProof } from "@/lib/payment-proof-storage";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function detectImage(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "image/webp";
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId") || "";
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(orderId)) return NextResponse.json({ error: "Nomor pesanan tidak valid." }, { status: 400 });
  try {
    const order = await withAuthenticatedDb(async (tx, userId) => {
      const rows = await tx`
        select o.id as order_id, o.order_number, o.total_amount, o.shipping_amount,
          o.shipping_confirmed_at, o.currency, o.status as order_status,
          p.id as payment_id, p.payment_method, p.status as payment_status,
          pp.status as proof_status, pp.review_note
        from public.orders o
        join public.payments p on p.order_id=o.id
        left join lateral (
          select status, review_note from public.payment_proofs
          where order_id=o.id order by created_at desc limit 1
        ) pp on true
        where o.id=${orderId}::uuid and o.buyer_user_id=${userId}::uuid
        limit 1
      `;
      return rows[0] ?? null;
    });
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ order }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Gagal memuat status pembayaran." }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const orderId = String(form?.get("orderId") ?? "");
  const paymentId = String(form?.get("paymentId") ?? "");
  const file = form?.get("file");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(orderId) || !uuid.test(paymentId) || !(file instanceof File)) {
    return NextResponse.json({ error: "Data bukti pembayaran tidak valid." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Ukuran bukti maksimal 5 MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectImage(bytes);
  if (!mimeType) return NextResponse.json({ error: "File harus berupa gambar JPG, PNG, atau WebP yang valid." }, { status: 415 });
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
  let objectKey = "";
  let uploaded = false;

  try {
    await withAuthenticatedDb(async (tx, userId) => {
      // Keep the order/payment rows locked until the private object and proof
      // record are committed. Admin shipping changes cannot race this upload.
      const rows = await tx`
        select o.id, o.shipping_confirmed_at, o.total_amount,
          p.id as payment_id, p.amount, p.status as payment_status,
          o.status as order_status
        from public.orders o
        join public.payments p on p.order_id=o.id
        where o.id=${orderId}::uuid and p.id=${paymentId}::uuid
          and o.buyer_user_id=${userId}::uuid
        for update of o, p
      `;
      const order = rows[0];
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (order.order_status !== "pending_payment" || order.payment_status !== "pending") {
        throw new Error("ORDER_NOT_PAYABLE");
      }
      if (!order.shipping_confirmed_at || Number(order.amount) !== Number(order.total_amount)) {
        throw new Error("SHIPPING_NOT_CONFIRMED");
      }

      objectKey = `${userId}/${orderId}/${crypto.randomUUID()}.${extension}`;
      await uploadPaymentProof(objectKey, bytes, mimeType);
      uploaded = true;
      await tx`
        insert into public.payment_proofs
          (payment_id, order_id, uploaded_by, object_key, mime_type, file_size_bytes)
        values
          (${paymentId}::uuid, ${orderId}::uuid, ${userId}::uuid, ${objectKey}, ${mimeType}, ${bytes.byteLength})
      `;
    });

    return NextResponse.json({ success: true, message: "Bukti pembayaran berhasil dikirim dan menunggu verifikasi admin." }, { status: 201 });
  } catch (error) {
    if (uploaded && objectKey) await deletePaymentProofObject(objectKey).catch(() => undefined);
    const message = error instanceof Error ? error.message : "";
    const known: Record<string, { status: number; error: string }> = {
      UNAUTHENTICATED: { status: 401, error: "Silakan masuk terlebih dahulu." },
      ORDER_NOT_FOUND: { status: 404, error: "Pesanan tidak ditemukan." },
      ORDER_NOT_PAYABLE: { status: 409, error: "Pesanan ini tidak lagi menunggu pembayaran." },
      SHIPPING_NOT_CONFIRMED: { status: 409, error: "Tunggu admin mengonfirmasi ongkos kirim dan total akhir sebelum mengunggah bukti." },
      PAYMENT_PROOF_STORAGE_NOT_CONFIGURED: { status: 503, error: "Penyimpanan bukti pembayaran belum dikonfigurasi oleh admin." },
    };
    if (message.includes("payment_proofs_one_pending_per_order") || message.includes("duplicate key")) {
      return NextResponse.json({ error: "Bukti pembayaran sebelumnya masih menunggu pemeriksaan." }, { status: 409 });
    }
    const result = known[message] ?? { status: 500, error: "Terjadi kesalahan saat mengirim bukti pembayaran." };
    console.error("[payment-proof] Submission failed", message);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
