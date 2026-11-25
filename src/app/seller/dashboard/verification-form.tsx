"use client";

import { useCallback, useEffect, useState } from "react";

type Store = { id: string; name: string; status: string };
type Verification = { id: string; store_id: string; store_name: string; verification_type: string; status: string; review_note: string | null; submitted_at: string };

export function SellerVerificationForm({ stores }: { stores: Store[] }) {
  const [items,setItems] = useState<Verification[]>([]);
  const [storeId,setStoreId] = useState(stores.find((s)=>s.status!=="active")?.id ?? "");
  const [kind,setKind] = useState("individual");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/seller/verifications");
    if (response.ok) {
      const data = await response.json() as { verifications: Verification[] };
      setItems(data.verifications);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/seller/verifications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({storeId,verificationType:kind})});
      const data = await response.json() as {error?:string};
      if (!response.ok) throw new Error(data.error ?? "Pengajuan gagal.");
      setMessage("Pengajuan verifikasi berhasil dikirim.");
      await refresh();
    } catch(error) { setMessage(error instanceof Error ? error.message : "Terjadi kesalahan."); }
    finally { setBusy(false); }
  }

  const eligible = stores.filter((s)=>s.status!=="active");
  return <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
    <div><p className="text-xs font-bold uppercase tracking-[.18em] text-sky-600">Seller onboarding</p><h2 className="mt-2 text-xl font-bold">Verifikasi toko</h2><p className="mt-1 text-sm text-gray-500">Ajukan pemeriksaan toko agar dapat diaktifkan oleh tim EXGARASI.</p></div>
    {eligible.length>0 && <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <label className="text-xs font-semibold text-gray-600">Pilih toko<select value={storeId} onChange={(e)=>setStoreId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm">{eligible.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="text-xs font-semibold text-gray-600">Jenis penjual<select value={kind} onChange={(e)=>setKind(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"><option value="individual">Perorangan</option><option value="business">Badan usaha</option></select></label>
      <button disabled={busy||!storeId} className="self-end rounded-xl bg-[#111318] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?"Mengirim…":"Ajukan verifikasi"}</button>
    </form>}
    {message && <p role="status" className="mt-3 text-sm text-sky-700">{message}</p>}
    <div className="mt-5 divide-y divide-gray-100">{items.map((item)=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">{item.store_name}</p><p className="text-xs text-gray-500">{item.verification_type==="business"?"Badan usaha":"Perorangan"} · {new Date(item.submitted_at).toLocaleDateString("id-ID")}</p>{item.review_note&&<p className="mt-1 text-xs text-gray-500">Catatan admin: {item.review_note}</p>}</div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">{item.status==="pending"?"Menunggu":item.status==="approved"?"Disetujui":"Ditolak"}</span></div>)}</div>
    <p className="mt-4 text-xs leading-5 text-gray-400">Tahap ini mencatat pengajuan dan keputusan admin. Upload KTP/NIB dan penyimpanan dokumen aman melalui R2 akan diaktifkan pada tahap berikutnya sebelum verifikasi dokumen diwajibkan.</p>
  </section>;
}
