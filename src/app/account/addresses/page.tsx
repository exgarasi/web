import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { AccountHeader } from "@/components/account-header";
import { AddressBook } from "./address-book";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
 const user=await getCurrentUser();
 if(!user) redirect("/sign-in");
 return <main className="min-h-screen bg-[#f7f9fc] text-[#111827]">
  <AccountHeader name={user.full_name||"EXGARASI member"} email={user.email} roles={user.roles as string[]} active="account"/>
  <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
   <Link href="/account/dashboard" className="mb-5 inline-flex text-sm font-semibold text-[#008fe8]">← Kembali ke akun</Link>
   <AddressBook/>
  </div>
 </main>;
}
