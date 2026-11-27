"use client";

import { useRef, useState } from "react";

export function SellerInviteForm() {
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const urlInput = useRef<HTMLInputElement>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setUrl("");
    setCopied(false);
    try {
      const response = await fetch("/api/admin/seller-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json() as { error?: string; acceptUrl?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not create invitation.");
      if (!result.acceptUrl) throw new Error("Invitation was created but no acceptance link was returned.");
      setUrl(result.acceptUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvitation() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setError("");
    } catch {
      urlInput.current?.focus();
      urlInput.current?.select();
      setError("Tidak dapat menyalin otomatis. Tautan sudah dipilih; silakan salin secara manual.");
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
      <label className="sr-only" htmlFor="seller-invite-email">Email seller</label>
      <input
        id="seller-invite-email"
        type="email"
        required
        autoComplete="email"
        placeholder="seller@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="rounded-xl border px-4 py-3 text-sm"
      />
      <button type="submit" disabled={busy} className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "Creating..." : "Invite seller"}
      </button>
      {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      {url && (
        <div className="rounded-xl bg-sky-50 p-3 text-sm sm:col-span-2">
          <p className="font-semibold text-sky-900">Invitation link created. Send this link to the invited seller:</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              ref={urlInput}
              readOnly
              aria-label="Seller invitation link"
              value={url}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-gray-700"
            />
            <button type="button" onClick={() => void copyInvitation()} className="rounded-lg bg-[#111318] px-4 py-2 text-xs font-bold text-white hover:bg-[#0099ff]">
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          {copied && <p role="status" className="mt-2 text-xs font-semibold text-sky-800">Invitation link copied.</p>}
        </div>
      )}
    </form>
  );
}
