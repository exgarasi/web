"use client";

import { useState } from "react";

type Props = { initialName: string; initialEmail: string; initialPhone: string };

export function ProfileForm({ initialName, initialEmail, initialPhone }: Props) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name, phone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Profil gagal disimpan.");
      setName(result.profile.full_name);
      setPhone(result.profile.phone || "");
      setMessage("Profil berhasil diperbarui.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block text-xs font-bold text-[#344054]">Nama lengkap
        <input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} autoComplete="name" className="mt-2 h-12 w-full rounded-xl border border-[#dfe5eb] bg-white px-4 text-sm outline-none focus:border-[#0099ff] focus:ring-4 focus:ring-[#0099ff]/10" />
      </label>
      <label className="block text-xs font-bold text-[#344054]">Alamat email
        <input value={initialEmail} readOnly aria-readonly="true" className="mt-2 h-12 w-full cursor-not-allowed rounded-xl border border-[#e5eaf0] bg-[#f7f9fc] px-4 text-sm text-[#7b8794]" />
        <span className="mt-1 block text-[11px] font-normal text-[#7b8794]">Email akun tidak dapat diubah dari halaman ini.</span>
      </label>
      <label className="block text-xs font-bold text-[#344054]">Nomor WhatsApp / telepon
        <input type="tel" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" placeholder="+62 812..." className="mt-2 h-12 w-full rounded-xl border border-[#dfe5eb] bg-white px-4 text-sm outline-none focus:border-[#0099ff] focus:ring-4 focus:ring-[#0099ff]/10" />
      </label>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-800">{message}</p>}
      <button disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#111318] px-6 text-xs font-bold text-white transition hover:bg-[#0099ff] disabled:opacity-50">{busy ? "Menyimpan..." : "Simpan perubahan"}</button>
    </form>
  );
}
