"use client";

import { useEffect, useState } from "react";

type Store = { id: string; name: string; status: string };
type Verification = { id: string; store_id: string; store_name: string; verification_type: string; status: string; review_note: string | null; submitted_at: string; has_document?: boolean };

export function SellerVerificationForm({ stores }: { stores: Store[] }) {
  const [items,setItems] = useState<Verification[]>([]);
  const [storeId,setStoreId] = useState(stores.find((s)=>s.status==="invited"||s.status==="pending_review")?.id ?? "");
  const [kind,setKind] = useState("individual");
  const [file,setFile] = useState<File|null>(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");

  async function refresh() {
    const response = await fetch("/api/seller/verifications",{cache:"no-store"});
    if (response.ok) {
      const data = await response.json() as { verifications: Verification[] };
      setItems(data.verifications);
    }
  }
  useEffect(() => {
    let cancelled=false;
    fetch("/api/seller/verifications",{cache:"no-store"})
      .then(async (response)=>response.ok?await response.json() as {verifications:Verification[]}:null)
      .then((data)=>{if(!cancelled&&data)setItems(data.verifications);})
      .catch(()=>{});
    return ()=>{cancelled=true;};
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!file){setMessage("Unggah dokumen identitas atau legalitas toko terlebih dahulu.");return;}
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/seller/verifications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({storeId,verificationType:kind})});
      const data = await response.json() as {verification?:{id:string};error?:string};
      if (!response.ok || !data.verification?.id) throw new Error(data.error ?? "Pengajuan gagal.");
      const form=new FormData();
      form.set("verificationId",data.verification.id);
      form.set("file",file);
      const upload=await fetch("/api/seller/verifications/document",{method:"POST",body:form});
      const uploadData=await upload.json() as {error?:string;message?:string};
      if(!upload.ok) throw new Error(uploadData.error??"Dokumen gagal diunggah. Silakan coba lagi.");
      setMessage("Pengajuan dan dokumen berhasil dikirim. Toko menunggu pemeriksaan admin.");
      setFile(null);
      const input=document.getElementById("seller-verification-file") as HTMLInputElement|null;
      if(input) input.value="";
      await refresh();
    } catch(error) { setMessage(error instanceof Error ? error.message : "Terjadi kesalahan."); }
    finally { setBusy(false); }
  }

  const eligible = stores.filter((s)=>s.status==="invited"||s.status==="pending_review");
  return <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
    <div><p className="text-xs font-bold uppercase tracking-[.18em] text-sky-600">Seller onboarding</p><h2 className="mt-2 text-xl font-bold">Verifikasi toko</h2><p className="mt-1 text-sm text-gray-500">Lengkapi data dan unggah dokumen untuk pemeriksaan tim EXGARASI.</p></div>
    {eligible.length>0 && <form onSubmit={submit} className="mt-5 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-600">Pilih toko<select value={storeId} onChange={(e)=>setStoreId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm">{eligible.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-600">Jenis penjual<select value={kind} onChange={(e)=>setKind(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"><option value="individual">Perorangan (KTP)</option><option value="business">Badan usaha (NIB/dokumen usaha)</option></select></label>
      </div>
      <label className="text-xs font-semibold text-gray-600">Dokumen verifikasi <input id="seller-verification-file" required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(e)=>setFile(e.target.files?.[0]??null)} className="mt-2 block w-full rounded-xl border border-gray-200 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2"/><span className="mt-1 block text-xs font-normal text-gray-400">PDF, JPG, PNG, WebP · maksimal 10 MB. Pastikan dokumen terbaca jelas.</span></label>
      <button disabled={busy||!storeId||!file} className="justify-self-start rounded-xl bg-[#111318] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?"Mengirim pengajuan…":"Kirim pengajuan & dokumen"}</button>
    </form>}
    {message && <p role="status" className="mt-3 text-sm text-sky-700">{message}</p>}
    <div className="mt-5 divide-y divide-gray-100">{items.map((item)=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">{item.store_name}</p><p className="text-xs text-gray-500">{item.verification_type==="business"?"Badan usaha":"Perorangan"} · {new Date(item.submitted_at).toLocaleDateString("id-ID")} · {item.has_document?"Dokumen tersimpan":"Dokumen belum ada"}</p>{item.review_note&&<p className="mt-1 text-xs text-gray-500">Catatan admin: {item.review_note}</p>}</div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">{item.status==="pending"?"Menunggu":item.status==="approved"?"Disetujui":"Ditolak"}</span></div>)}</div>
    <p className="mt-4 text-xs leading-5 text-gray-400">Dokumen disimpan dalam bucket privat. Hanya admin berwenang yang dapat membuka pratinjau sementara untuk proses verifikasi.</p>
  </section>;
}
