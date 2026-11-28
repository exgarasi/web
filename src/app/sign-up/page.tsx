"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck, UserRoundPlus } from "lucide-react";
import { CurrencySwitcher, LanguageSwitcher, useLocale } from "@/components/locale-provider";
import { signIn, signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const id = locale === "id";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function signUpWithGoogle() {
    setBusy(true);
    setError("");
    try {
      const result = await signIn.social({ provider: "google", callbackURL: "/account/dashboard" });
      if (result.error) setError(result.error.message ?? (id ? "Gagal mendaftar dengan Google." : "Unable to sign up with Google."));
    } catch {
      setError(id ? "Gagal memulai pendaftaran Google. Silakan coba lagi." : "Could not start Google sign-up. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await signUp.email({ name, email, password, callbackURL: "/account/dashboard" });
      if (result.error) {
        setError(result.error.message ?? (id ? "Gagal membuat akun." : "Unable to create account."));
      } else if (process.env.NODE_ENV === "production") {
        setMessage(id ? "Akun berhasil dibuat. Periksa email Anda untuk melakukan verifikasi sebelum masuk." : "Account created. Check your email and verify your address before signing in.");
      } else {
        router.push("/account/dashboard");
      }
    } catch {
      setError(id ? "Terjadi gangguan saat membuat akun. Silakan coba lagi." : "Something went wrong while creating your account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[.92fr_1fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#0c131c] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{backgroundImage:"url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=85')"}}/>
        <div className="absolute inset-0 bg-gradient-to-br from-[#09111b]/95 via-[#0b1520]/75 to-[#0b1520]/35"/>
        <Link href="/" className="relative z-10 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0099ff] text-sm font-black text-white">EX</span><span className="text-lg font-black tracking-[.17em]">EXGARASI<span className="text-[#0099ff]">.</span></span></Link>
        <div className="relative z-10 max-w-xl pb-8"><p className="text-[10px] font-bold tracking-[.25em] text-[#61bdff]">GABUNG BERSAMA KOMUNITAS</p><h2 className="mt-5 text-5xl font-semibold leading-[1.04] tracking-[-.05em] xl:text-6xl">{id ? "Dunia otomotif, satu komunitas." : "Automotive culture, one community."}</h2><p className="mt-6 max-w-md text-sm leading-7 text-white/65">{id ? "Buat akun untuk menjelajahi marketplace, menyimpan pilihan, dan mengikuti aktivitas pesanan Anda." : "Create an account to explore the marketplace, save your finds, and follow your orders."}</p><div className="mt-10 flex items-center gap-2 text-[11px] text-white/60"><ShieldCheck size={15} className="text-[#55baff]"/> {id ? "Pendaftaran akun pembeli terbuka" : "Open customer registration"}</div></div>
        <p className="relative z-10 text-[10px] tracking-wider text-white/35">© {new Date().getFullYear()} EXGARASI</p>
      </section>
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between"><Link href="/" className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#7b8794] hover:text-[#0099ff] lg:hidden"><ArrowLeft size={14}/> EXGARASI</Link><div className="ml-auto flex items-center gap-2"><LanguageSwitcher/><CurrencySwitcher/></div></div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-12">
          <Link href="/" className="hidden text-[11px] font-semibold text-[#8a94a3] transition hover:text-[#0099ff] lg:inline-flex"><ArrowLeft size={14} className="mr-2"/> {id ? "Kembali ke beranda" : "Back to home"}</Link>
          <p className="mt-8 text-[10px] font-bold tracking-[.25em] text-[#0099ff]">BUAT AKUN ANDA</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.05em] text-[#111318]">{id ? "Bergabung dengan EXGARASI." : "Join EXGARASI."}</h1>
          <p className="mt-3 text-[13px] leading-6 text-[#7b8794]">{id ? "Mulai perjalanan Anda di marketplace otomotif." : "Start your journey in the automotive marketplace."}</p>
          <button type="button" onClick={signUpWithGoogle} disabled={busy} className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dfe5eb] bg-white text-[12px] font-bold text-[#27313d] transition hover:border-[#0099ff] hover:bg-[#f8fcff] disabled:cursor-not-allowed disabled:opacity-50"><span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full border border-[#e5e7eb] text-[13px] font-black text-[#4285F4]">G</span> {id ? "Daftar dengan Google" : "Sign up with Google"}</button>
          <div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-[#a0a9b5]"><span className="h-px flex-1 bg-[#e8edf2]"/>{id ? "atau dengan email" : "or with email"}<span className="h-px flex-1 bg-[#e8edf2]"/></div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-[11px] font-bold text-[#333b48]">{id ? "Nama lengkap" : "Full name"}<input required minLength={2} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder={id ? "Nama Anda" : "Your name"} className="mt-2.5 h-12 w-full rounded-xl border border-[#dfe5eb] bg-[#fbfcfd] px-4 text-[13px] font-normal outline-none transition placeholder:text-[#a5aeba] focus:border-[#0099ff] focus:bg-white focus:ring-4 focus:ring-[#0099ff]/10"/></label>
            <label className="block text-[11px] font-bold text-[#333b48]">{id ? "Alamat email" : "Email address"}<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com" className="mt-2.5 h-12 w-full rounded-xl border border-[#dfe5eb] bg-[#fbfcfd] px-4 text-[13px] font-normal outline-none transition placeholder:text-[#a5aeba] focus:border-[#0099ff] focus:bg-white focus:ring-4 focus:ring-[#0099ff]/10"/></label>
            <label className="block text-[11px] font-bold text-[#333b48]">{id ? "Kata sandi · minimal 10 karakter" : "Password · at least 10 characters"}<input type="password" required minLength={10} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="•••••••••" className="mt-2.5 h-12 w-full rounded-xl border border-[#dfe5eb] bg-[#fbfcfd] px-4 text-[13px] font-normal outline-none transition placeholder:text-[#a5aeba] focus:border-[#0099ff] focus:bg-white focus:ring-4 focus:ring-[#0099ff]/10"/></label>
            {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</p>}
            {message && <p role="status" className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-[12px] leading-5 text-sky-900">{message}</p>}
            <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#111318] text-[12px] font-bold leading-none !text-white transition hover:bg-[#0099ff] disabled:cursor-not-allowed disabled:opacity-50">{busy ? (id ? "Sedang membuat akun..." : "Creating account...") : (id ? "Buat akun EXGARASI" : "Create EXGARASI account")}<ArrowRight size={15}/></button>
          </form>
          <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-[#f6f8fa] p-3.5"><UserRoundPlus size={15} className="mt-0.5 shrink-0 text-[#0099ff]"/><p className="text-[10px] leading-5 text-[#778293]">{id ? "Akses penjual hanya tersedia melalui undangan dan persetujuan pengelola." : "Seller access is invitation-only and requires store approval."}</p></div>
          <p className="mt-6 text-center text-[12px] text-[#818b99]">{id ? "Sudah punya akun?" : "Already registered?"} <Link href="/sign-in" className="font-bold text-[#008fe8] hover:underline">{id ? "Masuk" : "Sign in"}</Link></p>
        </div>
        <p className="pb-3 text-center text-[10px] text-[#a0a9b5]">EXGARASI · {id ? "Marketplace otomotif untuk enthusiast." : "The automotive marketplace for enthusiasts."}</p>
      </section>
    </main>
  );
}
