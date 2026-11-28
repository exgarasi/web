import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { AccountHeader } from "@/components/account-header";
import { CartView } from "./cart-view";
export const runtime="nodejs";export const dynamic="force-dynamic";
export default async function CartPage(){const user=await getCurrentUser();if(!user)redirect("/sign-in?callbackURL=%2Fcart");return <main className="min-h-screen bg-[#f7f9fc] text-[#111318]"><AccountHeader name={user.full_name||"Anggota EXGARASI"} email={user.email} roles={user.roles as string[]}/><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12"><p className="mb-5 text-[10px] font-bold tracking-[.2em] text-[#168cf0]">EXGARASI / BELANJA</p><CartView/></div></main>}