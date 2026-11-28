"use client";

import { useState } from "react";

type PreviewRow = {
  rowNumber: number;
  data: Record<string, string>;
  issues: Array<{ field: string; message: string }>;
};
type PreviewResult = {
  summary: { total: number; valid: number; invalid: number };
  rows: PreviewRow[];
  note: string;
};

export function SellerBulkCsv({ stores }: { stores: Array<{ id: string; name: string; status: string }> }) {
  const activeStores = stores.filter((store) => store.status === "active");
  const [storeId, setStoreId] = useState(activeStores[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function validate() {
    if (!file || !storeId) return;
    setBusy(true); setError(""); setPreview(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("storeId", storeId);
      const response = await fetch("/api/seller/products/bulk/preview", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Validasi CSV gagal.");
      setPreview(data as PreviewResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Validasi CSV gagal.");
    } finally { setBusy(false); }
  }

  return <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-sky-600">Katalog produk</p>
        <h2 className="mt-2 text-xl font-bold">Bulk Upload & Bulk Edit</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">Siapkan semua data dan hingga lima URL foto dalam satu file CSV. SKU mengikuti sistem toko Anda.</p>
      </div>
      <div className="flex flex-wrap gap-2"><a href="/templates/exgarasi-products-template.csv" download className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">Unduh template CSV</a>{activeStores.length > 0 && <a href={`/api/seller/products/bulk/export?storeId=${storeId}`} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">Ekspor produk toko</a>}</div>
    </div>
    {activeStores.length === 0 ? <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Impor produk akan tersedia setelah toko disetujui dan berstatus aktif.</p> : <>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-600">Toko tujuan
          <select value={storeId} onChange={(e) => { setStoreId(e.target.value); setPreview(null); }} className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm">
            {activeStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-600">File CSV
          <input type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }} className="mt-2 block w-full rounded-xl border border-gray-200 p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2" />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={validate} disabled={!file || !storeId || busy} className="rounded-xl bg-[#111318] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Memeriksa CSV…" : "Validasi & Preview"}</button>
        <span className="text-xs text-gray-500">Maksimal 2 MB · 500 produk per file</span>
      </div>
    </>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {preview && <>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">Total baris</p><p className="mt-1 text-2xl font-black">{preview.summary.total}</p></div>
        <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Valid</p><p className="mt-1 text-2xl font-black text-emerald-800">{preview.summary.valid}</p></div>
        <div className="rounded-xl bg-red-50 p-3"><p className="text-xs text-red-700">Perlu diperbaiki</p><p className="mt-1 text-2xl font-black text-red-800">{preview.summary.invalid}</p></div>
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="p-3">Baris</th><th className="p-3">Produk</th><th className="p-3">SKU</th><th className="p-3">Harga</th><th className="p-3">Foto</th><th className="p-3">Hasil validasi</th></tr></thead>
          <tbody>{preview.rows.map((row) => <tr key={row.rowNumber} className="border-t border-gray-100 align-top">
            <td className="p-3">{row.rowNumber}</td><td className="p-3 font-semibold">{row.data.title || "—"}<p className="mt-1 text-xs font-normal text-gray-500">{row.data.category || "Kategori belum diisi"}</p></td>
            <td className="p-3">{row.data.sku || "—"}</td><td className="p-3">{row.data.currency || "IDR"} {row.data.price || "—"}</td>
            <td className="p-3">{[1,2,3,4,5].filter((n) => row.data[`image_${n}`]).length}/5 URL</td>
            <td className="p-3">{row.issues.length ? <ul className="space-y-1 text-xs text-red-700">{row.issues.map((issue, i) => <li key={i}><strong>{issue.field}:</strong> {issue.message}</li>)}</ul> : <span className="font-semibold text-emerald-700">Valid</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="mt-3 rounded-xl bg-sky-50 p-3 text-xs leading-5 text-sky-800">{preview.note} Tombol simpan belum diaktifkan sampai pengambilan foto ke R2 dan transaksi impor aman selesai dibuat.</p>
    </>}
  </section>;
}
