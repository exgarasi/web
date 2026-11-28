import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { withAuthenticatedDb } from "@/lib/db-context";
import { AccountHeader } from "@/components/account-header";
import { ProfileForm } from "./profile-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AccountProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const profile = await withAuthenticatedDb(async (tx) => {
    const rows = await tx`select full_name, email, phone from public.users where id = public.app_current_user_id() limit 1`;
    return rows[0] ?? null;
  });
  if (!profile) redirect("/sign-in");

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#111827]">
      <AccountHeader name={profile.full_name || "EXGARASI member"} email={profile.email} roles={user.roles as string[]} active="account" />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/account/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-[#667085] hover:text-[#0099ff]"><ArrowLeft size={15}/> Kembali ke akun</Link>
        <section className="mt-5 rounded-3xl border border-[#e5eaf0] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf6ff] text-[#008fe8]"><UserRound size={20}/></span><div><p className="text-[10px] font-bold tracking-[.2em] text-[#008fe8]">PENGATURAN AKUN</p><h1 className="mt-1 text-2xl font-black">Informasi pribadi</h1></div></div>
          <p className="mt-3 text-sm text-[#667085]">Perbarui nama dan nomor kontak yang digunakan untuk komunikasi pesanan EXGARASI.</p>
          <ProfileForm initialName={profile.full_name || ""} initialEmail={profile.email} initialPhone={profile.phone || ""}/>
        </section>
      </div>
    </main>
  );
}
