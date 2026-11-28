"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CarFront, LayoutDashboard, LogOut, Store, ShoppingCart } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { CurrencySwitcher } from "@/components/locale-provider";

type AccountHeaderProps = {
  name: string;
  email: string;
  roles?: string[];
  active?: "account" | "seller" | "admin";
};

export function AccountHeader({ name, email, roles = [], active = "account" }: AccountHeaderProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = roles.some((role) => ["admin", "super_admin", "finance", "moderator"].includes(role));

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await signOut();
      if (result.error) throw new Error(result.error.message || "Logout failed");
      router.replace("/sign-in");
      router.refresh();
    } catch {
      setError("Logout gagal. Periksa koneksi lalu coba lagi.");
      setBusy(false);
    }
  }

  const navClass = (key: string) =>
    `inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0099ff] focus-visible:ring-offset-2 ${active === key ? "bg-[#eaf6ff] text-[#006fbd]" : "text-[#596273] hover:bg-[#f1f6fb] hover:text-[#006fbd]"}`;

  return (
    <header className="sticky top-0 z-40 border-b border-[#e5eaf0] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" aria-label="EXGARASI home" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111318] text-xs font-black text-white">EX</span>
          <span className="text-[16px] font-black tracking-[.14em] text-[#111318]">EXGARASI<span className="text-[#0099ff]">.</span></span>
        </Link>
        <nav aria-label="Navigasi akun" className="order-3 flex w-full flex-wrap items-center gap-1 border-t border-[#edf0f4] pt-2 sm:order-2 sm:w-auto sm:border-0 sm:pt-0">
          <Link href="/catalog" className={navClass("marketplace")}><CarFront size={16} strokeWidth={2}/><span>Marketplace</span><ArrowUpRight size={12}/></Link>
          <Link href="/cart" className={navClass("cart")}><ShoppingCart size={16} strokeWidth={2}/><span>Keranjang</span></Link>
          <Link href="/account/dashboard" aria-current={active === "account" ? "page" : undefined} className={navClass("account")}><LayoutDashboard size={16} strokeWidth={2}/><span>Akun saya</span></Link>
          {roles.includes("seller") && <Link href="/seller/dashboard" aria-current={active === "seller" ? "page" : undefined} className={navClass("seller")}><Store size={16} strokeWidth={2}/><span>Seller Center</span></Link>}
          {isAdmin && <Link href="/admin/dashboard" aria-current={active === "admin" ? "page" : undefined} className={navClass("admin")}><LayoutDashboard size={16} strokeWidth={2}/><span>Admin</span></Link>}
        </nav>
        <div className="order-2 flex min-w-0 flex-wrap items-center justify-end gap-2 sm:order-3 sm:gap-3">
          <CurrencySwitcher />
          <div className="hidden min-w-0 text-right sm:block">
            <p className="max-w-40 truncate text-xs font-bold text-[#202733]">{name || "EXGARASI member"}</p>
            <p className="max-w-40 truncate text-[10px] text-[#778293]">{email}</p>
          </div>
          <button type="button" onClick={handleSignOut} disabled={busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d8e0e8] bg-white px-3.5 text-xs font-bold text-[#344054] shadow-sm transition hover:border-[#e5484d] hover:bg-[#fff5f5] hover:text-[#b42318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0099ff] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60" aria-label="Keluar dari akun">
            <LogOut size={16} strokeWidth={2.2}/><span>{busy ? "Keluar..." : "Logout"}</span>
          </button>
        </div>
        {error && <p role="alert" className="order-4 w-full rounded-lg bg-[#fff1f0] px-3 py-2 text-xs font-medium text-[#b42318]">{error}</p>}
      </div>
    </header>
  );
}
