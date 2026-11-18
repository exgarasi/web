"use client";
import { useState } from "react";

export function SellerInviteForm() {
  const [email,setEmail]=useState(""); const [url,setUrl]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setUrl("");
    const response=await fetch("/api/admin/seller-invitations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
    const result=await response.json();
    if(!response.ok) setError(result.error??"Could not create invitation."); else setUrl(result.acceptUrl);
    setBusy(false);
  }
  return <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
    <input type="email" required placeholder="seller@example.com" value={email} onChange={e=>setEmail(e.target.value)} className="rounded-xl border px-4 py-3 text-sm"/>
    <button disabled={busy} className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"Creating...":"Invite seller"}</button>
    {error&&<p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
    {url&&<div className="rounded-xl bg-sky-50 p-3 text-sm sm:col-span-2"><p className="font-semibold text-sky-900">Invitation link created. Copy and send it to the invited seller:</p><input readOnly value={url} onFocus={e=>e.currentTarget.select()} className="mt-2 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-gray-700"/></div>}
  </form>;
}
