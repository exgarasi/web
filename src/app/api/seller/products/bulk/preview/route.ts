import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 500;
const REQUIRED = ["title", "category", "sku", "condition", "price", "currency", "stock"] as const;
const IMAGE_COLUMNS = ["image_1", "image_2", "image_3", "image_4", "image_5"] as const;
const ALLOWED_COLUMNS = new Set([
  "listing_id", "title", "description", "details", "category", "sku", "brand", "series",
  "model", "year", "condition", "price", "currency", "stock", ...IMAGE_COLUMNS,
]);

type CsvRow = Record<string, string>;
type Issue = { field: string; message: string };

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (quoted) throw new Error("CSV memiliki tanda kutip yang tidak ditutup.");
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function safeImageUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":")) return false;
    return true;
  } catch { return false; }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const storeId = String(form.get("storeId") ?? "");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv"))
      return NextResponse.json({ error: "Pilih file CSV." }, { status: 400 });
    if (file.size < 1 || file.size > MAX_FILE_BYTES)
      return NextResponse.json({ error: "Ukuran CSV maksimal 2 MB." }, { status: 413 });
    if (!/^[0-9a-f-]{36}$/i.test(storeId))
      return NextResponse.json({ error: "Toko tidak valid." }, { status: 400 });

    const text = (await file.text()).replace(/^\uFEFF/, "");
    const parsed = parseCsv(text);
    if (parsed.length < 2) return NextResponse.json({ error: "CSV belum berisi baris produk." }, { status: 400 });
    if (parsed.length - 1 > MAX_ROWS) return NextResponse.json({ error: `Maksimal ${MAX_ROWS} produk per impor.` }, { status: 400 });

    const headers = parsed[0].map((h) => h.trim().toLowerCase());
    if (new Set(headers).size !== headers.length)
      return NextResponse.json({ error: "Nama kolom CSV tidak boleh duplikat." }, { status: 400 });
    const unknown = headers.filter((h) => !ALLOWED_COLUMNS.has(h));
    const missing = REQUIRED.filter((h) => !headers.includes(h));
    if (unknown.length || missing.length)
      return NextResponse.json({ error: "Header CSV tidak sesuai template.", unknownColumns: unknown, missingColumns: missing }, { status: 400 });

    const rawRows = parsed.slice(1);
    const rows: Array<{ rowNumber: number; data: CsvRow; issues: Issue[] }> = rawRows.map((values, index) => {
      const data: CsvRow = {};
      headers.forEach((header, i) => { data[header] = (values[i] ?? "").trim(); });
      const issues: Issue[] = [];
      for (const field of REQUIRED) if (!data[field]) issues.push({ field, message: "Wajib diisi." });
      if (data.condition && !["new", "used", "refurbished"].includes(data.condition.toLowerCase()))
        issues.push({ field: "condition", message: "Gunakan new, used, atau refurbished." });
      if (data.currency && !["IDR", "USD"].includes(data.currency.toUpperCase()))
        issues.push({ field: "currency", message: "Gunakan IDR atau USD." });
      if (data.price && (!/^\d+$/.test(data.price) || Number(data.price) < 1 || !Number.isSafeInteger(Number(data.price))))
        issues.push({ field: "price", message: "Harga harus bilangan bulat positif." });
      if (data.stock && (!/^\d+$/.test(data.stock) || !Number.isSafeInteger(Number(data.stock))))
        issues.push({ field: "stock", message: "Stok harus bilangan bulat nol atau lebih." });
      for (const field of IMAGE_COLUMNS) if (data[field] && !safeImageUrl(data[field]))
        issues.push({ field, message: "Gunakan URL HTTPS publik yang valid; URL privat/IP tidak diterima." });
      if (data.title && data.title.length > 180) issues.push({ field: "title", message: "Judul maksimal 180 karakter." });
      if (data.description && data.description.length > 5000) issues.push({ field: "description", message: "Deskripsi maksimal 5.000 karakter." });
      if (data.sku && data.sku.length > 100) issues.push({ field: "sku", message: "SKU maksimal 100 karakter." });
      return { rowNumber: index + 2, data, issues };
    });

    const skuRows = new Map<string, number[]>();
    for (const row of rows) {
      const sku = row.data.sku?.toLowerCase();
      if (sku) skuRows.set(sku, [...(skuRows.get(sku) ?? []), row.rowNumber]);
    }
    for (const [sku, numbers] of skuRows) if (numbers.length > 1)
      for (const row of rows.filter((r) => r.data.sku?.toLowerCase() === sku))
        row.issues.push({ field: "sku", message: "SKU duplikat di dalam file CSV." });

    const result = await withAuthenticatedDb(async (tx, appUserId) => {
      const memberships = await tx`
        select s.id, s.status, sm.member_role
        from public.stores s
        left join public.store_members sm on sm.store_id=s.id and sm.user_id=${appUserId}::uuid
        where s.id=${storeId}::uuid
          and (s.owner_user_id=${appUserId}::uuid or sm.user_id is not null)
        limit 1
      `;
      const store = memberships[0];
      if (!store) throw new Error("FORBIDDEN");
      if (store.status !== "active") throw new Error("STORE_NOT_ACTIVE");
      if (store.member_role && !["owner", "manager", "catalog_manager"].includes(String(store.member_role)))
        throw new Error("FORBIDDEN");

      const categories = await tx`select name from public.categories where is_active=true`;
      const categoryNames = new Set(categories.map((c) => String(c.name).trim().toLowerCase()));
      const brands = await tx`select name from public.brands`;
      const brandNames = new Set(brands.map((b) => String(b.name).trim().toLowerCase()));
      const existing = await tx`select seller_sku from public.listings where store_id=${storeId}::uuid`;
      const existingSkus = new Set(existing.map((r) => String(r.seller_sku).toLowerCase()));

      for (const row of rows) {
        const d = row.data;
        if (d.category && !categoryNames.has(d.category.toLowerCase()))
          row.issues.push({ field: "category", message: "Kategori tidak ditemukan atau tidak aktif di EXGARASI." });
        if (d.brand && !brandNames.has(d.brand.toLowerCase()))
          row.issues.push({ field: "brand", message: "Merek belum terdaftar di katalog EXGARASI." });
        if (d.sku && existingSkus.has(d.sku.toLowerCase()))
          row.issues.push({ field: "sku", message: "SKU sudah digunakan di toko ini." });
      }
      return { storeStatus: String(store.status) };
    });

    const validCount = rows.filter((r) => r.issues.length === 0).length;
    return NextResponse.json({
      store: result,
      summary: { total: rows.length, valid: validCount, invalid: rows.length - validCount },
      rows: rows.map((r) => ({ rowNumber: r.rowNumber, data: r.data, issues: r.issues })),
      note: "Tahap ini hanya validasi dan preview. Belum ada produk atau foto yang disimpan.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validasi CSV gagal.";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : message === "STORE_NOT_ACTIVE" ? 409 : 500;
    return NextResponse.json({ error: status === 500 ? "Terjadi kesalahan saat memvalidasi CSV." : message }, { status });
  }
}
