"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { CurrencySwitcher, LanguageSwitcher, useLocale } from "@/components/locale-provider";
import { resetPassword } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  const { locale } = useLocale();
  const id = locale === "id";
  const [token, setToken] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("token");
    setToken(value ?? "");
    setInvalid(!value || params.get("error") === "INVALID_TOKEN");
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 10) {
      setError(id ? "Kata sandi harus minimal 10 karakter." : "Password must be at least 10 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError(id ? "Konfirmasi kata sandi tidak cocok." : "Password confirmation does not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await resetPassword({ newPassword: password, token });
      if (result.error) setError(result.error.message ?? (id ? "Tautan tidak valid atau sudah kedaluwarsa." : "This link is invalid or has expired."));
      else setDone(true);
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
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf6ff] text-[#0099ff]"><LockKeyhole size={22}/></div>
        <p className="text-[10px] font-bold tracking-[.25em] text-[#0099ff]">ACCOUNT SECURITY</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-.05em] text-[#111318]">{id ? "Buat kata sandi baru." : "Create a new password."}</h1>
        <p className="mt-3 text-[13px] leading-6 text-[#7b8794]">{id ? "Gunakan kata sandi baru minimal 10 karakter." : "Choose a new password with at least 10 characters."}</p>
        {done ? (
          <div className="mt-8 rounded-xl border border-sky-100 bg-sky-50 p-4">
            <p role="status" className="text-[13px] leading-6 text-sky-900">{id ? "Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru." : "Your password has been updated. Sign in with your new password."}</p>
            <Link href="/sign-in" className="mt-4 inline-flex items-center gap-2 text-[12px] font-bold text-[#008fe8] hover:underline">{id ? "Masuk ke akun" : "Sign in"}<ArrowRight size={14}/></Link>
          </div>
        ) : invalid ? (
          <div className="mt-8 rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-[13px] leading-6 text-red-700">{id ? "Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru." : "This reset link is invalid or has expired. Please request a new link."}</p>
            <Link href="/forgot-password" className="mt-4 inline-flex text-[12px] font-bold text-[#008fe8] hover:underline">{id ? "Minta tautan baru" : "Request a new link"}</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block text-[11px] font-bold text-[#333b48]">{id ? "Kata sandi baru" : "New password"}<input type="password" required minLength={10} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••••" className="mt-2.5 h-12 w-full rounded-xl border border-[#dfe5eb] bg-[#fbfcfd] px-4 text-[13px] font-normal outline-none transition placeholder:text-[#a5aeba] focus:border-[#0099ff] focus:bg-white focus:ring-4 focus:ring-[#0099ff]/10"/></label>
            <label className="block text-[11px] font-bold text-[#333b48]">{id ? "Ulangi kata sandi baru" : "Confirm new password"}<input type="password" required minLength={10} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="••••••••••" className="mt-2.5 h-12 w-full rounded-xl border border-[#dfe5eb] bg-[#fbfcfd] px-4 text-[13px] font-normal outline-none transition placeholder:text-[#a5aeba] focus:border-[#0099ff] focus:bg-white focus:ring-4 focus:ring-[#0099ff]/10"/></label>
            {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</p>}
            <button disabled={busy || !token} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#111318] text-[12px] font-bold text-white transition hover:bg-[#0099ff] disabled:cursor-not-allowed disabled:opacity-50">{busy ? (id ? "Menyimpan..." : "Saving...") : (id ? "Simpan kata sandi baru" : "Save new password")}<ArrowRight size={15}/></button>
          </form>
        )}
      </section>
    </main>
  );
}
