"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [error,setError]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const result=await signUp.email({name,email,password,callbackURL:"/account/dashboard"});
    if(result.error) setError(result.error.message??"Unable to create account.");
    else if (process.env.NODE_ENV === "production") setMessage("Account created. Check your email and verify the address before signing in.");
    else router.push("/account/dashboard");
    setBusy(false);
  }
  return <main className="grid min-h-screen place-items-center bg-gray-50 px-6"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
    <Link href="/" className="text-lg font-black tracking-[.2em]">EXGARASI<span className="text-sky-500">.</span></Link>
    <h1 className="mt-8 text-3xl font-black">Create your account.</h1><p className="mt-2 text-sm text-gray-500">Join the EXGARASI automotive community.</p>
    <label className="mt-7 block text-sm font-semibold">Full name<input required minLength={2} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3"/></label>
    <label className="mt-4 block text-sm font-semibold">Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3"/></label>
    <label className="mt-4 block text-sm font-semibold">Password<input type="password" required minLength={10} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3"/></label>
    {error&&<p className="mt-4 text-sm text-red-600">{error}</p>}
    {message&&<p className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{message}</p>}
    <button disabled={busy} className="mt-7 w-full rounded-xl bg-gray-950 px-5 py-3 font-bold text-white disabled:opacity-50">{busy?"Creating account...":"Create account"}</button>
    <p className="mt-5 text-xs text-gray-500">Seller access remains invitation-only and requires store approval.</p>
    <Link href="/sign-in" className="mt-4 block text-center text-sm font-semibold text-sky-600">Already registered? Sign in</Link>
  </form></main>;
}