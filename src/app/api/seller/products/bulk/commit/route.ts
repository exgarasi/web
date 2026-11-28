import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CsvData = Record<string, string>;
type Row = { rowNumber: number; data: CsvData; issues?: unknown[] };
type MediaBucket = {
  put(key: string, value: ArrayBuffer, options: { httpMetadata: { contentType: string } }): Promise<unknown>;
  delete(keys: string[]): Promise<unknown>;
};
type RuntimeEnv = { EXGARASI_MEDIA?: MediaBucket };

const IMAGE_FIELDS = ["image_1", "image_2", "image_3", "image_4", "image_5"] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isSafePublicHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || !host) return false;
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
    if (host.startsWith("[") || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return false;
    if (/^(0x[0-9a-f]+|0[0-7]+)$/i.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

async function uploadImages(bucket: MediaBucket, storeId: string, data: CsvData) {
  const keys: string[] = [];
  try {
    for (const field of IMAGE_FIELDS) {
      const source = (data[field] ?? "").trim();
      if (!source) continue;
      if (!isSafePublicHttpsUrl(source)) throw new Error("INVALID_IMAGE_URL");

      // Do not follow redirects: a public URL must not redirect the Worker to a private host.
      const response = await fetch(source, { redirect: "manual", signal: AbortSignal.timeout(12_000) });
      if (response.status >= 300 && response.status < 400) throw new Error("IMAGE_REDIRECT_NOT_ALLOWED");
      if (!response.ok) throw new Error("IMAGE_FETCH_FAILED");

      const mime = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const extension = MIME_EXT[mime];
      if (!extension) throw new Error("UNSUPPORTED_IMAGE_TYPE");

      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (declaredLength > MAX_IMAGE_BYTES) throw new Error("IMAGE_TOO_LARGE");
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength < 1 || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("IMAGE_TOO_LARGE");

      const key = `seller-media/${storeId}/${crypto.randomUUID()}.${extension}`;
      await bucket.put(key, bytes, { httpMetadata: { contentType: mime } });
      keys.push(key);
    }
    return keys;
  } catch (error) {
    if (keys.length) await bucket.delete(keys).catch(() => undefined);
    throw error;
  }
}

export async function POST(request: Request) {
  const uploadedKeys: string[] = [];
  let bucket: MediaBucket | undefined;
  try {
    const { env } = getCloudflareContext();
    bucket = (env as unknown as RuntimeEnv).EXGARASI_MEDIA;
    if (!bucket) {
      return NextResponse.json(
        { error: "Bucket R2 Preview belum terhubung ke Worker. Impor belum diaktifkan." },
        { status: 503 },
      );
    }

    const body = await request.json() as { storeId?: string; rows?: Row[] };
    const storeId = body.storeId ?? "";
    const rows = body.rows ?? [];
    if (!/^[0-9a-f-]{36}$/i.test(storeId)) {
      return NextResponse.json({ error: "Toko tidak valid." }, { status: 400 });
    }
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 500) {
      return NextResponse.json({ error: "Impor harus berisi 1–500 baris." }, { status: 400 });
    }
    if (rows.some((row) => !row || typeof row.data !== "object" || !row.data || (row.issues?.length ?? 0) > 0)) {
      return NextResponse.json({ error: "Hanya baris yang lolos preview yang dapat disimpan." }, { status: 400 });
    }

    const results: Array<{ rowNumber: number; listingId?: string; error?: string }> = [];
    for (const row of rows) {
      const data = row.data;
      const listingId = (data.listing_id ?? "").trim() || null;
      if (listingId && !/^[0-9a-f-]{36}$/i.test(listingId)) {
        results.push({ rowNumber: row.rowNumber, error: "ID listing tidak valid." });
        continue;
      }

      let imageKeys: string[] = [];
      try {
        imageKeys = await uploadImages(bucket, storeId, data);
        uploadedKeys.push(...imageKeys);
        const id = await withAuthenticatedDb(async (tx) => {
          const result = await tx`
            select public.seller_bulk_upsert_listing(
              ${storeId}::uuid,
              ${listingId}::uuid,
              ${JSON.stringify(data)}::jsonb,
              ${imageKeys}::text[]
            ) as listing_id
          `;
          return String(result[0].listing_id);
        });
        results.push({ rowNumber: row.rowNumber, listingId: id });
      } catch (error) {
        if (imageKeys.length) {
          await bucket.delete(imageKeys).catch(() => undefined);
          for (const key of imageKeys) uploadedKeys.splice(uploadedKeys.indexOf(key), 1);
        }
        const code = error instanceof Error ? error.message : "ROW_SAVE_FAILED";
        const messages: Record<string, string> = {
          UNAUTHENTICATED: "Sesi login berakhir.",
          FORBIDDEN: "Tidak memiliki akses ke toko atau listing ini.",
          DUPLICATE_SKU: "SKU sudah digunakan di toko ini.",
          CATEGORY_NOT_FOUND: "Kategori tidak ditemukan.",
          BRAND_NOT_FOUND: "Merek tidak ditemukan.",
          LISTING_NOT_FOUND: "Listing tidak ditemukan di toko ini.",
          INVALID_PRODUCT_DATA: "Data produk tidak valid.",
          INVALID_IMAGE_URL: "URL foto tidak aman atau tidak valid.",
          IMAGE_REDIRECT_NOT_ALLOWED: "URL foto mengalihkan ke alamat lain; gunakan URL gambar langsung.",
          IMAGE_FETCH_FAILED: "Foto tidak dapat diunduh.",
          UNSUPPORTED_IMAGE_TYPE: "Format foto harus JPG, PNG, atau WebP.",
          IMAGE_TOO_LARGE: "Ukuran setiap foto maksimal 5 MB.",
        };
        results.push({ rowNumber: row.rowNumber, error: messages[code] ?? "Baris gagal disimpan." });
      }
    }

    return NextResponse.json({
      summary: {
        total: results.length,
        saved: results.filter((row) => row.listingId).length,
        failed: results.filter((row) => row.error).length,
      },
      rows: results,
      note: "Produk baru dibuat sebagai pending/draft. Perubahan listing lama masuk antrean review.",
    });
  } catch (error) {
    if (bucket && uploadedKeys.length) await bucket.delete(uploadedKeys).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Impor produk gagal.";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: status === 500 ? "Terjadi kesalahan saat menyimpan impor." : message }, { status });
  }
}
