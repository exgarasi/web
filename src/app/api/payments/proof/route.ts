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

  try {
    const authorization = await withAuthenticatedDb(async (tx, userId) => {
      const rows = await tx`
        select o.id, p.id as payment_id, o.shipping_confirmed_at,
          o.total_amount, p.amount, p.status as payment_status, o.status as order_status
        from public.orders o
        join public.payments p on p.order_id=o.id
        where o.id=${orderId}::uuid and p.id=${paymentId}::uuid
          and o.buyer_user_id=${userId}::uuid
        limit 1
      `;
      return { userId, order: rows[0] };
    });
    if (!authorization.order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    if (authorization.order.order_status !== "pending_payment" || authorization.order.payment_status !== "pending") {
      return NextResponse.json({ error: "Pesanan ini tidak lagi menunggu pembayaran." }, { status: 409 });
    }
    if (!authorization.order.shipping_confirmed_at || Number(authorization.order.amount) !== Number(authorization.order.total_amount)) {
      return NextResponse.json({ error: "Tunggu admin mengonfirmasi ongkos kirim dan total akhir sebelum mengunggah bukti pembayaran." }, { status: 409 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = detectImage(bytes);
    if (!mimeType) return NextResponse.json({ error: "File harus berupa gambar JPG, PNG, atau WebP yang valid." }, { status: 415 });
    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
    const objectKey = `${authorization.userId}/${orderId}/${crypto.randomUUID()}.${extension}`;

    await uploadPaymentProof(objectKey, bytes, mimeType);
    try {
      await withAuthenticatedDb(async (tx, userId) => {
        await tx`
          insert into public.payment_proofs
            (payment_id, order_id, uploaded_by, object_key, mime_type, file_size_bytes)
          values
            (${paymentId}::uuid, ${orderId}::uuid, ${userId}::uuid, ${objectKey}, ${mimeType}, ${bytes.byteLength})
        `;
      });
    } catch (error) {
      await deletePaymentProofObject(objectKey).catch(() => undefined);
      throw error;
    }

    return NextResponse.json({ success: true, message: "Bukti pembayaran berhasil dikirim dan menunggu verifikasi admin." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengunggah bukti pembayaran.";
    if (message === "UNAUTHENTICATED") return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    if (message === "PAYMENT_PROOF_STORAGE_NOT_CONFIGURED") return NextResponse.json({ error: "Penyimpanan bukti pembayaran belum dikonfigurasi oleh admin." }, { status: 503 });
    if (message.includes("payment_proofs_one_pending_per_order") || message.includes("duplicate key")) return NextResponse.json({ error: "Bukti pembayaran sebelumnya masih menunggu pemeriksaan." }, { status: 409 });
    console.error("[payment-proof] Submission failed", error);
    return NextResponse.json({ error: "Terjadi kesalahan saat mengirim bukti pembayaran." }, { status: 500 });
  }
}
