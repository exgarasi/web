import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { SellerVerificationQueue } from "./review-queue";
import { AccountHeader } from "@/components/account-header";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SellerVerificationsPage() {
  const user=await getCurrentUser();
  if(!user) redirect("/sign-in");
  const roles=user.roles as string[];
  if(!roles.includes("admin")&&!roles.includes("super_admin")) redirect("/");
  return <main className="min-h-screen bg-[#f7f9fc] text-gray-950">\n    <AccountHeader name={user.full_name || "Administrator"} email={user.email} roles={roles} active="admin" />
    <header className="border-b border-gray-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><Link href="/admin/dashboard" className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-sky-600"><ArrowLeft size={16}/> Dashboard</Link><span className="text-sm font-black tracking-widest">EXGARASI <span className="text-sky-500">ADMIN</span></span></div></header>
    <section className="mx-auto max-w-5xl px-5 py-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#0099ff]">Seller management</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Verifikasi seller</h1><p className="mt-2 text-sm text-gray-500">Tinjau pengajuan partner dan aktifkan toko setelah disetujui.</p><SellerVerificationQueue/></section>
  </main>;
}
