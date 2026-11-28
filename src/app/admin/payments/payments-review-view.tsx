"use client";

import { useCallback, useEffect, useState } from "react";

type PaymentRow = {
  proof_id: string | null; object_key: string | null; mime_type: string | null; file_size_bytes: number | null;
  submitted_at: string | null; proof_status: string | null; order_id: string; order_number: string;
  total_amount: number; currency: string; shipping_amount: number; shipping_confirmed_at: string | null;
  payment_id: string; payment_method: string; payment_status: string;
  buyer_name: string; buyer_email: string; proof_url: string | null;
};
const money = (value: number, currency: string) => new Intl.NumberFormat("id-ID", { style:"currency", currency, maximumFractionDigits:currency==="IDR"?0:2 }).format(Number(value));

export function PaymentsReviewView() {
  const [rows,setRows]=useState<PaymentRow[]>([]);
  const [shipping,setShipping]=useState<Record<string,string>>({});
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const load=useCallback(async()=>{
    const response=await fetch("/api/admin/payments",{cache:"no-store"});
    const payload=await response.json();
    if(!response.ok) throw new Error(payload.error||"Gagal memuat pembayaran.");
    setRows(payload.payments||[]);
  },[]);
  useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);

  async function act(key:string,body:Record<string,unknown>){
    setBusy(key);setError("");setMessage("");
    try{
      const response=await fetch("/api/admin/payments/review",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const payload=await response.json();
      if(!response.ok) throw new Error(payload.error||"Tindakan gagal.");
      setMessage("Perubahan berhasil disimpan.");await load();
    }catch(e){setError(e instanceof Error?e.message:"Terjadi kesalahan.");}
    finally{setBusy("");}
  }

  return <main className="mx-auto max-w-6xl space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[.2em] text-[#168cf0]">Finance · Manual payment</p><h1 className="mt-2 text-3xl font-black">Verifikasi pembayaran</h1><p className="mt-2 text-sm text-[#667085]">Konfirmasi ongkos kirim terlebih dahulu. Bukti hanya dapat disetujui setelah total akhir sesuai.</p></header>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message&&<p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {rows.length===0?<div className="rounded-2xl border bg-white p-10 text-center text-sm text-[#667085]">Belum ada pesanan yang menunggu pembayaran.</div>:<div className="space-y-5">
      {rows.map(row=><article key={row.proof_id ?? row.order_id} className="grid gap-5 rounded-2xl border border-[#e5eaf0] bg-white p-5 lg:grid-cols-[220px_1fr]">
        {row.proof_url ? <a href={row.proof_url} target="_blank" rel="noreferrer" className="block"><img src={row.proof_url} alt={`Bukti pembayaran ${row.order_number}`} className="aspect-[4/5] w-full rounded-xl bg-slate-100 object-contain" /><span className="mt-2 block text-center text-xs font-semibold text-[#168cf0]">Buka bukti ukuran penuh</span></a> : <div className="grid aspect-[4/5] place-items-center rounded-xl bg-slate-50 p-5 text-center text-sm text-[#667085]">Belum ada bukti pembayaran</div>}
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold text-[#168cf0]">{row.order_number}</p><h2 className="mt-1 text-lg font-black">{row.buyer_name||"Pembeli"}</h2><p className="text-xs text-[#667085]">{row.buyer_email}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{row.proof_id ? "Bukti menunggu verifikasi" : "Menunggu pembayaran"}</span></div>
          <div className="grid gap-2 text-sm sm:grid-cols-2"><p>Metode: <strong>{row.payment_method==="manual_qris"?"QRIS":"Transfer bank"}</strong></p><p>Total produk + kirim: <strong>{money(row.total_amount,row.currency)}</strong></p><p>Ongkir: <strong>{money(row.shipping_amount,row.currency)}</strong></p><p>Dikirim: <strong>{row.submitted_at ? new Date(row.submitted_at).toLocaleString("id-ID") : "Belum ada"}</strong></p></div>
          {!row.shipping_confirmed_at?<div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><strong className="text-sm text-amber-900">Ongkos kirim belum dikonfirmasi</strong><p className="mt-1 text-xs text-amber-800">Tentukan ongkos kirim final sebelum pembeli dapat mengirim bukti pembayaran.</p><div className="mt-3 flex gap-2"><input inputMode="numeric" placeholder="Nominal ongkir" value={shipping[row.order_id]??""} onChange={e=>setShipping(old=>({...old,[row.order_id]:e.target.value}))} className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm" /><button disabled={!!busy || shipping[row.order_id] === undefined || shipping[row.order_id].trim() === ""} onClick={()=>void act(row.order_id,{action:"confirm_shipping",orderId:row.order_id,shippingAmount:Number(shipping[row.order_id])})} className="rounded-lg bg-[#168cf0] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Konfirmasi ongkir</button></div></div>:<div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Ongkos kirim telah dikonfirmasi.</div>}
          {row.proof_id && <label className="block text-xs font-semibold text-[#475467]">Catatan (wajib jika menolak)<textarea value={notes[row.proof_id]??""} onChange={e=>setNotes(old=>({...old,[row.proof_id]:e.target.value}))} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>}
          <div className="flex flex-wrap gap-2">{row.proof_id && <><button disabled={!!busy||!row.shipping_confirmed_at} onClick={()=>void act(row.proof_id,{action:"approve",proofId:row.proof_id,note:notes[row.proof_id]??""})} className="rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">{busy===row.proof_id?"Memproses...":"Setujui & tandai lunas"}</button><button disabled={!!busy||!(notes[row.proof_id]??"").trim()} onClick={()=>void act(row.proof_id,{action:"reject",proofId:row.proof_id,note:notes[row.proof_id]??""})} className="rounded-full border border-red-200 px-5 py-2.5 text-xs font-bold text-red-700 disabled:opacity-40">Tolak bukti</button></>}</div>
        </div>
      </article>)}
    </div>}
  </main>;
}
