"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { CurrencySwitcher, LanguageSwitcher, useLocale } from "@/components/locale-provider";
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
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[1fr_.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#0c131c] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="absolute inset-0 bg-cover bg-center opacity-45" style={{backgroundImage:"url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1800&q=85')"}}/>
        <div className="absolute inset-0 bg-gradient-to-br from-[#09111b]/95 via-[#0b1520]/75 to-[#0b1520]/35"/>
        <Link href="/" className="relative z-10 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0099ff] text-sm font-black text-white">EX</span><span className="text-lg font-black tracking-[.17em]">EXGARASI<span className="text-[#0099ff]">.</span></span></Link>
        <div className="relative z-10 max-w-xl pb-8"><p className="text-[10px] font-bold tracking-[.25em] text-[#61bdff]">THE AUTOMOTIVE MARKETPLACE</p><h2 className="mt-5 text-5xl font-semibold leading-[1.04] tracking-[-.05em] xl:text-6xl">Passion brings us together.</h2><p className="mt-6 max-w-md text-sm leading-7 text-white/65">{id ? "Masuk untuk mengelola koleksi, mengikuti pesanan, dan terhubung dengan ekosistem otomotif EXGARASI." : "Sign in to manage your collection, follow orders, and connect with the EXGARASI automotive ecosystem."}</p><div className="mt-10 flex items-center gap-2 text-[11px] text-white/60"><ShieldCheck size={15} className="text-[#55baff]"/> {id ? "Akses akun yang aman dan terverifikasi" : "Secure and verified account access"}</div></div>
        <p className="relative z-10 text-[10px] tracking-wider text-white/35">© {new Date().getFullYear()} EXGARASI</p>
      </section>
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between"><Link href="/" className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#7b8794] hover:text-[#0099ff] lg:hidden"><ArrowLeft size={14}/> EXGARASI</Link><div className="ml-auto flex items-center gap-2"><LanguageSwitcher/><CurrencySwitcher/></div></div>
        <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center py-12">
          <Link href="/" className="hidden text-[11px] font-semibold text-[#8a94a3] transition hover:text-[#0099ff] lg:inline-flex"><ArrowLeft size={14} className="mr-2"/> {id ? "Kembali ke beranda" : "Back to home"}</Link>
          <p className="mt-8 text-[10px] font-bold tracking-[.25em] text-[#0099ff]">WELCOME BACK</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.05em] text-[#111318]">{id ? "Selamat datang." : "Welcome back."}</h1>
          <p className="mt-3 text-[13px] leading-6 text-[#7b8794]">{id ? "Masuk ke akun EXGARASI Anda untuk melanjutkan." : "Sign in to your EXGARASI account to continue."}</p>
          <form onSubmit={submit} className="mt-9 space-y-5">
            <label className="block text-[11px] font-bold text-[#333b48]">{id ? "Alamat email" : "Email address"}<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com" className="mt-2.5 h-12 w-full rounded-xl border border-[#dfe5eb] bg-[#fbfcfd] px-4 text-[13px] font-normal outline-none transition placeholder:text-[#a5aeba] focus:border-[#0099ff] focus:bg-white focus:ring-4 focus:ring-[#0099ff]/10"/></label>
            <label className="block text-[11px] font-bold text-[#333b48]">{id ? "Kata sandi" : "Password"}<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••" className="mt-2.5 h-12 w-full rounded-xl border border-[#dfe5eb] bg-[#fbfcfd] px-4 text-[13px] font-normal outline-none transition placeholder:text-[#a5aeba] focus:border-[#0099ff] focus:bg-white focus:ring-4 focus:ring-[#0099ff]/10"/></label>
            {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</p>}
            <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#111318] text-[12px] font-bold leading-none !text-white transition hover:bg-[#0099ff] disabled:cursor-not-allowed disabled:opacity-50">{busy ? (id ? "Sedang masuk..." : "Signing in...") : (id ? "Masuk ke akun" : "Sign in")}<ArrowRight size={15}/></button>
          </form>
          <p className="mt-7 text-center text-[12px] text-[#818b99]">{id ? "Belum punya akun?" : "New to EXGARASI?"} <Link href="/sign-up" className="font-bold text-[#008fe8] hover:underline">{id ? "Buat akun" : "Create an account"}</Link></p>
        </div>
        <p className="pb-3 text-center text-[10px] text-[#a0a9b5]">EXGARASI · {id ? "Marketplace otomotif untuk enthusiast." : "The automotive marketplace for enthusiasts."}</p>
      </section>
    </main>
  );
}
