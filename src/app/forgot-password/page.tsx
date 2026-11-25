"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import { CurrencySwitcher, LanguageSwitcher, useLocale } from "@/components/locale-provider";
import { requestPasswordReset } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const { locale } = useLocale();
  const id = locale === "id";
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSent(false);
    try {
      const result = await requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) setError(result.error.message ?? (id ? "Permintaan belum dapat diproses. Coba lagi." : "Unable to process your request. Please try again."));
      else setSent(true);
    } catch {
      setError(id ? "Terjadi gangguan. Silakan coba lagi." : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-5 py-6 sm:px-10">
        <Link href="/sign-in" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#7b8794] hover:text-[#0099ff]"><ArrowLeft size={15}/>{id ? "Kembali ke login" : "Back to sign in"}</Link>
        <div className="flex items-center gap-2"><LanguageSwitcher/><CurrencySwitcher/></div>
      </header>
      <section className="mx-auto flex min-h-[75vh] w-full max-w-[460px] flex-col justify-center px-5 py-12">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf6ff] text-[#0099ff]"><MailCheck size={22}/></div>
        <p className="text-[10px] font-bold tracking-[.25em] text-[#0099ff]">ACCOUNT RECOVERY</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-.05em] text-[#111318]">{id ? "Lupa kata sandi?" : "Forgot password?"}</h1>
        <p className="mt-3 text-[13px] leading-6 text-[#7b8794]">{id ? "Masukkan email akun EXGARASI Anda. Kami akan mengirimkan tautan untuk membuat kata sandi baru." : "Enter your EXGARASI account email. We will send you a link to create a new password."}</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-[11px] font-bold text-[#333b48]">{id ? "Alamat email" : "Email address"}<input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@email.com" className="mt-2.5 h-12 w-full rounded-xl border border-[#dfe5eb] bg-[#fbfcfd] px-4 text-[13px] font-normal outline-none transition placeholder:text-[#a5aeba] focus:border-[#0099ff] focus:bg-white focus:ring-4 focus:ring-[#0099ff]/10"/></label>
          {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</p>}
          {sent && <p role="status" className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-[12px] leading-5 text-sky-900">{id ? "Jika email tersebut terdaftar, tautan reset password akan dikirim. Periksa Inbox dan Spam." : "If that email is registered, a password reset link will be sent. Check your inbox and spam folder."}</p>}
          <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#111318] text-[12px] font-bold text-white transition hover:bg-[#0099ff] disabled:cursor-not-allowed disabled:opacity-50">{busy ? (id ? "Mengirim..." : "Sending...") : (id ? "Kirim tautan reset" : "Send reset link")}<ArrowRight size={15}/></button>
        </form>
        <p className="mt-7 text-center text-[12px] text-[#818b99]">{id ? "Ingat kata sandi Anda?" : "Remember your password?"} <Link href="/sign-in" className="font-bold text-[#008fe8] hover:underline">{id ? "Masuk" : "Sign in"}</Link></p>
      </section>
    </main>
  );
}
