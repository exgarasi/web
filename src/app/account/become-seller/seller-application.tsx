"use client";

import { useEffect,useState } from "react";

type Application={store_id:string;store_name:string;store_slug:string;store_status:string;verification_id:string|null;verification_type:string|null;verification_status:string|null;review_note:string|null;submitted_at:string|null;reviewed_at:string|null};
const labels:Record<string,string>={pending:"Menunggu pemeriksaan Admin",approved:"Disetujui",rejected:"Perlu diperbaiki / Ditolak",active:"Toko aktif",pending_review:"Menunggu pemeriksaan",invited:"Undangan Seller",suspended:"Ditangguhkan",closed:"Ditutup"};
export function SellerApplication(){
 const [application,setApplication]=useState<Application|null>(null);
 const [storeName,setStoreName]=useState(""),[description,setDescription]=useState(""),[phone,setPhone]=useState(""),[type,setType]=useState("individual");
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 async function load(){const r=await fetch("/api/seller/applications");const d=await r.json();if(!r.ok)throw new Error(d.error||"Gagal memuat pengajuan.");setApplication(d.application);}
 useEffect(()=>{load().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setMessage("");try{const r=await fetch("/api/seller/applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({storeName,description,supportPhone:phone,verificationType:type})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Pengajuan gagal.");await load();setMessage("Pengajuan Seller berhasil dikirim. Tunggu pemeriksaan Admin.");}catch(e){setError(e instanceof Error?e.message:"Pengajuan gagal.");}finally{setBusy(false);}}
 if(loading)return <p className="mt-6 text-sm text-[#667085]">Memuat status pengajuan…</p>;
 if(application)return <div className="mt-6 rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-5">
  <p className="text-xs font-bold tracking-wide text-[#667085]">STATUS PENGAJUAN TOKO</p><h2 className="mt-2 text-lg font-black">{application.store_name}</h2>
  <p className="mt-2 text-sm font-semibold text-[#0078c8]">{labels[application.verification_status||""]||labels[application.store_status]||application.store_status}</p>
  <p className="mt-1 text-xs text-[#667085]">Status toko: {labels[application.store_status]||application.store_status}</p>
  {application.submitted_at&&<p className="mt-2 text-xs text-[#667085]">Diajukan: {new Date(application.submitted_at).toLocaleString("id-ID")}</p>}
  {application.review_note&&<div className="mt-4 rounded-xl bg-white p-3 text-sm"><strong>Catatan Admin:</strong><p className="mt-1">{application.review_note}</p></div>}
  {application.verification_status==="approved"&&<a href="/seller/dashboard" className="mt-4 inline-flex rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-bold text-white">Buka Seller Dashboard</a>}
  <p className="mt-4 text-xs leading-5 text-[#667085]">Jika pengajuan ditolak, hubungi Admin untuk arahan perbaikan. Pengajuan ulang mandiri belum dibuka.</p>
 </div>;
 return <form onSubmit={submit} className="mt-6 space-y-5">
  <div className="rounded-xl bg-[#f8fafc] p-4 text-xs leading-5 text-[#667085]">Pastikan email akun sudah diverifikasi. Satu akun hanya dapat memiliki satu toko/pengajuan Seller. Dokumen identitas atau legalitas belum diunggah pada tahap ini dan akan diminta melalui proses verifikasi lanjutan.</div>
  <label className="block text-xs font-bold text-[#344054]">Nama toko *<input required minLength={3} maxLength={80} value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="Contoh: Makassar Diecast Garage" className="mt-2 h-12 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none focus:border-[#0099ff]"/></label>
  <label className="block text-xs font-bold text-[#344054]">Nomor WhatsApp toko *<input required type="tel" maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+62 812..." className="mt-2 h-12 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none focus:border-[#0099ff]"/></label>
  <label className="block text-xs font-bold text-[#344054]">Jenis penjual *<select value={type} onChange={e=>setType(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm"><option value="individual">Perorangan</option><option value="business">Badan usaha</option></select></label>
  <label className="block text-xs font-bold text-[#344054]">Deskripsi toko (opsional)<textarea maxLength={1000} rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ceritakan produk atau layanan yang akan Anda jual…" className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-4 py-3 text-sm outline-none focus:border-[#0099ff]"/></label>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message&&<p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{message}</p>}
  <button disabled={busy} className="rounded-xl bg-[#111827] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"Mengirim…":"Kirim pengajuan Seller"}</button>
 </form>;
}
