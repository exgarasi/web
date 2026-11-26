import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { withAuthenticatedDb } from "@/lib/db-context";
import { SellerVerificationForm } from "./verification-form";
import { AccountHeader } from "@/components/account-header";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SellerDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const stores = await withAuthenticatedDb((tx) => tx`
    select s.id,s.name,s.slug,s.status,
      (select count(*)::int from public.listings l where l.store_id=s.id) as listing_count,
      (select count(*)::int from public.sub_orders so where so.store_id=s.id) as order_count
    from public.stores s where s.owner_user_id=${user.id}::uuid
      or exists(select 1 from public.store_members sm where sm.store_id=s.id and sm.user_id=${user.id}::uuid)
    order by s.created_at desc
  `);
  return <main className="min-h-screen bg-[#f7f9fc] text-[#111827]"><AccountHeader name={user.full_name || "EXGARASI member"} email={user.email} roles={user.roles as string[]} active="seller" /><div className="mx-auto max-w-6xl px-6 py-10">
    <p className="text-xs font-bold tracking-[.25em] text-sky-600">PARTNER CENTER</p><h1 className="mt-2 text-3xl font-black">Seller dashboard</h1><p className="mt-2 text-sm text-gray-500">Welcome, {user.full_name}</p>
    <div className="mt-8 grid gap-4 md:grid-cols-2">{stores.map((store)=><section key={store.id} className="rounded-2xl border bg-white p-6">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{store.name}</h2><p className="mt-1 text-sm text-gray-500">/{store.slug}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{store.status}</span></div>
      <div className="mt-6 flex gap-8"><div><p className="text-xs text-gray-500">Listings</p><p className="text-2xl font-black">{store.listing_count}</p></div><div><p className="text-xs text-gray-500">Orders</p><p className="text-2xl font-black">{store.order_count}</p></div></div>
    </section>)}{stores.length===0&&<section className="rounded-2xl border bg-white p-8"><h2 className="font-bold">No partner store yet</h2><p className="mt-2 text-sm text-gray-500">Seller access is invitation-only. Ask EXGARASI admin for an invitation.</p></section>}</div>
    {stores.length>0&&<SellerVerificationForm stores={stores.map((store)=>({id:String(store.id),name:String(store.name),status:String(store.status)}))}/>}
  </div></main>;
}
