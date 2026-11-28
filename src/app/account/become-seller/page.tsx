import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { AccountHeader } from "@/components/account-header";
import { SellerApplication } from "./seller-application";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BecomeSellerPage() {
  const user=await getCurrentUser();
  if(!user) redirect("/sign-in");
  if(user.status!=="active") redirect("/account/dashboard");
  return <main className="min-h-screen bg-[#f7f9fc] text-[#111827]">
    <AccountHeader name={user.full_name||"EXGARASI member"} email={user.email} roles={user.roles as string[]} active="account"/>
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/account/dashboard" className="text-sm font-semibold text-[#008fe8]">← Kembali ke akun</Link>
      <section className="mt-5 rounded-3xl border border-[#e5eaf0] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-bold tracking-[.2em] text-[#008fe8]">EXGARASI PARTNER SELLER</p>
        <h1 className="mt-2 text-2xl font-black">Daftar sebagai Seller</h1>
        <p className="mt-2 text-sm leading-6 text-[#667085]">Ajukan toko Anda untuk bergabung di marketplace EXGARASI. Tim Admin akan memeriksa pengajuan sebelum toko dapat berjualan.</p>
        <SellerApplication/>
      </section>
    </div>
  </main>;
}
