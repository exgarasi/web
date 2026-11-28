"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type OrderState = {
  order_id: string; order_number: string; total_amount: number | string; shipping_amount: number | string;
  shipping_confirmed_at: string | null; currency: string; order_status: string;
  payment_id: string; payment_method: string; payment_status: string;
  proof_status: string | null; review_note: string | null;
};
type Instructions = {
  configured: boolean;
  instructions: { method: "manual_bank_transfer" | "manual_qris"; bank?: { name: string; accountName: string; accountNumber: string }; qrisImageUrl?: string };
};
const money=(value:number|string,currency:string)=>new Intl.NumberFormat("id-ID",{style:"currency",currency,maximumFractionDigits:currency==="IDR"?0:2}).format(Number(value));

export function OrderPaymentView({orderId}:{orderId:string}) {
  const router=useRouter();
  const [order,setOrder]=useState<OrderState|null>(null);
  const [instructions,setInstructions]=useState<Instructions|null>(null);
  const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  const load=useCallback(async()=>{
    const response=await fetch("/api/payments/proof?orderId="+orderId,{cache:"no-store"});
    const payload=await response.json();
    if(response.status===401){router.replace("/sign-in?callbackURL="+encodeURIComponent("/orders/"+orderId));return;}
    if(!response.ok)throw new Error(payload.error||"Gagal memuat pesanan.");
    setOrder(payload.order);
    const payment=payload.order.payment_method;
    const instructionsResponse=await fetch("/api/payments/instructions?method="+payment,{cache:"no-store"});
    if(instructionsResponse.ok)setInstructions(await instructionsResponse.json());
  },[orderId,router]);

  useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);

  async function upload(){
    if(!order||!file)return;
    setBusy(true);setError("");setMessage("");
    try{
      const form=new FormData();
      form.set("orderId",order.order_id);form.set("paymentId",order.payment_id);form.set("file",file);
      const response=await fetch("/api/payments/proof",{method:"POST",body:form});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.error||"Gagal mengirim bukti pembayaran.");
      setMessage(payload.message||"Bukti pembayaran terkirim.");setFile(null);await load();
    }catch(e){setError(e instanceof Error?e.message:"Gagal mengirim bukti pembayaran.");}
    finally{setBusy(false);}
  }

  if(!order)return <main className="mx-auto max-w-2xl rounded-2xl border bg-white p-10 text-center text-sm text-[#667085]">{error||"Memuat detail pesanan..."}</main>;

  return <main className="mx-auto max-w-2xl space-y-5">
    <section className="rounded-3xl border border-[#e5eaf0] bg-white p-7">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#168cf0]">Order details</p>
      <h1 className="mt-2 text-2xl font-black">{order.order_number}</h1>
      <p className="mt-3 text-sm text-[#667085]">Status pesanan: <strong className="text-[#202733]">{order.order_status}</strong></p>
      <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <p>Ongkos kirim: <strong>{order.shipping_confirmed_at?money(order.shipping_amount,order.currency):"Menunggu konfirmasi"}</strong></p>
        <p>Total akhir: <strong>{money(order.total_amount,order.currency)}</strong></p>
      </div>
      <button onClick={()=>void load().catch(e=>setError(e.message))} className="mt-4 text-xs font-bold text-[#168cf0]">Perbarui status pesanan</button>
    </section>
    <section className="rounded-3xl border border-[#e5eaf0] bg-white p-7">
      <h2 className="text-lg font-black">Pembayaran</h2>
      {order.payment_status==="paid"?<p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Pembayaran telah diverifikasi. Pesanan Anda sudah lunas.</p>
      :order.order_status!=="pending_payment"?<p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">Pesanan ini tidak lagi menunggu pembayaran. Hubungi admin EXGARASI jika Anda memerlukan bantuan.</p>
      :order.proof_status==="pending"?<p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Bukti pembayaran telah diterima dan sedang diperiksa admin EXGARASI.</p>
      :!order.shipping_confirmed_at?<p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Jangan melakukan pembayaran dahulu. Admin akan mengonfirmasi ongkos kirim dan total akhir. Tekan perbarui status setelah konfirmasi.</p>
      :<div className="mt-4 space-y-4">
        {instructions?.configured&&instructions.instructions.method==="manual_bank_transfer"&&instructions.instructions.bank?<div className="rounded-xl bg-slate-50 p-4 text-sm"><p>Bank: <strong>{instructions.instructions.bank.name}</strong></p><p className="mt-2">Atas nama: <strong>{instructions.instructions.bank.accountName}</strong></p><p className="mt-2">Nomor rekening: <strong className="select-all">{instructions.instructions.bank.accountNumber}</strong></p></div>
        :instructions?.configured&&instructions.instructions.method==="manual_qris"&&instructions.instructions.qrisImageUrl?<img src={instructions.instructions.qrisImageUrl} alt="QRIS EXGARASI" className="mx-auto max-h-72 rounded-xl object-contain"/>
        :<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Instruksi pembayaran resmi belum dikonfigurasi. Jangan membayar sebelum instruksi tersedia.</p>}
        {order.proof_status==="rejected"&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Bukti sebelumnya ditolak. {order.review_note||"Silakan unggah bukti yang benar."}</p>}
        <p className="text-xs leading-5 text-[#667085]">Unggah bukti transfer atau pembayaran QRIS. Format JPG, PNG, WebP, maksimal 5 MB.</p>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]??null)} className="block w-full text-sm"/>
        <button disabled={!file||busy||!instructions?.configured} onClick={()=>void upload()} className="w-full rounded-full bg-[#168cf0] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{busy?"Mengunggah...":"Kirim bukti pembayaran"}</button>
      </div>}
      {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {message&&<p className="mt-4 text-sm text-emerald-700">{message}</p>}
    </section>
    <Link href="/catalog" className="block text-center text-sm font-semibold text-[#667085]">Kembali ke marketplace</Link>
  </main>;
}
