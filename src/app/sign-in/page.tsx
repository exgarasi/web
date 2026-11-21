"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LanguageSwitcher, useLocale } from "@/components/locale-provider";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const id = locale === "id";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await signIn.email({ email, password, callbackURL: "/account/dashboard" });
    if (result.error) setError(result.error.message ?? (id ? "Gagal masuk. Periksa kembali data Anda." : "Unable to sign in. Please check your details."));
    else router.push("/account/dashboard");
    setBusy(false);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 px-6 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-lg font-black tracking-[.2em]">EXGARASI<span className="text-sky-500">.</span></Link>
          <LanguageSwitcher />
        </div>
        <h1 className="mt-8 text-3xl font-black">{id ? "Selamat datang kembali." : "Welcome back."}</h1>
        <p className="mt-2 text-sm text-gray-500">{id ? "Masuk ke akun EXGARASI Anda." : "Sign in to your EXGARASI account."}</p>
        <label className="mt-7 block text-sm font-semibold">{id ? "Alamat email" : "Email address"}<input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
        <label className="mt-4 block text-sm font-semibold">{id ? "Kata sandi" : "Password"}<input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="mt-7 w-full rounded-xl bg-gray-950 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? (id ? "Sedang masuk..." : "Signing in...") : (id ? "Masuk" : "Sign in")}</button>
        <Link href="/sign-up" className="mt-5 block text-center text-sm font-semibold text-sky-600">{id ? "Buat akun pembeli" : "Create a customer account"}</Link>
      </form>
    </main>
  );
}
