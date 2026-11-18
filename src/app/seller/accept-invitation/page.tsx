"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AcceptSellerInvitationPage() {
  const params=useSearchParams(); const token=params.get("token")??"";
  const [storeName,setStoreName]=useState(""); const [storeSlug,setStoreSlug]=useState("");
  const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response=await fetch("/api/seller/accept-invitation",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,storeName,storeSlug})});
    const result=await response.json();
    setMessage(response.ok?"Invitation accepted. Your store is waiting for admin approval.":result.error??"Unable to accept invitation.");
    setBusy(false);
  }
  return <main className="grid min-h-screen place-items-center bg-gray-50 px-6"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border bg-white p-8">
    <p className="text-xs font-bold tracking-[.2em] text-sky-600">EXGARASI PARTNER PROGRAM</p><h1 className="mt-3 text-3xl font-black">Create your store</h1>
    <p className="mt-2 text-sm text-gray-500">Sign in with the invited email first, then submit your store details.</p>
    <label className="mt-7 block text-sm font-semibold">Store name<input required value={storeName} onChange={e=>setStoreName(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3"/></label>
    <label className="mt-4 block text-sm font-semibold">Store URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={storeSlug} onChange={e=>setStoreSlug(e.target.value.toLowerCase())} className="mt-2 w-full rounded-xl border px-4 py-3"/></label>
    <button disabled={busy||!token} className="mt-6 w-full rounded-xl bg-gray-950 px-5 py-3 font-bold text-white disabled:opacity-50">{busy?"Submitting...":"Accept invitation"}</button>
    {message&&<p className="mt-4 text-sm text-gray-600">{message}</p>}
  </form></main>;
}
