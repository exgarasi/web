"use client";

import { useCallback, useEffect, useState } from "react";

type Verification = { id:string; verification_type:string; status:string; submitted_at:string; store_name:string; store_slug:string; store_status:string; owner_name:string; owner_email:string; review_note:string|null };

export function SellerVerificationQueue() {
  const [items,setItems]=useState<Verification[]>([]);
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState("");
  const refresh = useCallback(async () => {
    const response=await fetch("/api/admin/seller-verifications");
    const data=await response.json() as {verifications?:Verification[];error?:string};
    if(!response.ok) throw new Error(data.error??"Gagal memuat data.");
    setItems(data.verifications??[]);
  }, []);
  useEffect(()=>{ void refresh().catch((e)=>setMessage(e.message)); },[refresh]);
  async function decide(id:string,decision:"approved"|"rejected") {
    setBusy(id);setMessage("");
    try {
      const response=await fetch(`/api/admin/seller-verifications/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision,reviewNote:notes[id]??""})});
      const data=await response.json() as {error?:string};
      if(!response.ok) throw new Error(data.error??"Keputusan gagal disimpan.");
      setMessage(decision==="approved"?"Seller disetujui dan toko diaktifkan.":"Pengajuan ditolak.");
      await refresh();
    } catch(e) {setMessage(e instanceof Error?e.message:"Terjadi kesalahan.");}
    finally {setBusy("");}
  }
  return <div className="mt-7 space-y-4">
    {message&&<p role="status" className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}
    {items.length===0?<div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">Belum ada pengajuan verifikasi seller.</div>:items.map((item)=><section key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{item.store_name}</h2><p className="mt-1 text-xs text-gray-500">/{item.store_slug} · {item.verification_type==="business"?"Badan usaha":"Perorangan"}</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">{item.status}</span></div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-gray-400">Pemilik</span><br/><b>{item.owner_name}</b></p><p><span className="text-gray-400">Email</span><br/><b>{item.owner_email}</b></p><p><span className="text-gray-400">Diajukan</span><br/>{new Date(item.submitted_at).toLocaleString("id-ID")}</p><p><span className="text-gray-400">Status toko</span><br/>{item.store_status}</p></div>
      {item.status==="pending"?<><label className="mt-4 block text-xs font-semibold text-gray-600">Catatan review (opsional)<textarea value={notes[item.id]??""} onChange={(e)=>setNotes((v)=>({...v,[item.id]:e.target.value}))} maxLength={1000} rows={2} className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm font-normal"/></label><div className="mt-4 flex flex-wrap gap-2"><button disabled={busy===item.id} onClick={()=>void decide(item.id,"approved")} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Setujui & aktifkan toko</button><button disabled={busy===item.id} onClick={()=>void decide(item.id,"rejected")} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50">Tolak pengajuan</button></div></>:item.review_note&&<p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">Catatan: {item.review_note}</p>}
    </section>)}
  </div>;
}
