import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { sql } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BuyerDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const orders = await sql`
    select order_number,status,total_amount,currency,placed_at
    from public.orders where buyer_user_id=${user.id}::uuid
    order by placed_at desc limit 20
  `;
  return <main className="min-h-screen bg-gray-50 px-6 py-12"><div className="mx-auto max-w-5xl">
    <p className="text-xs font-bold tracking-[.25em] text-sky-600">MY EXGARASI</p><h1 className="mt-2 text-3xl font-black">My account</h1>
    <p className="mt-2 text-sm text-gray-500">{user.full_name} · {user.email}</p>
    <section className="mt-8 overflow-hidden rounded-2xl border bg-white"><div className="border-b p-6"><h2 className="font-bold">Order history</h2></div>
      {orders.length===0?<p className="p-6 text-sm text-gray-500">Your orders will appear here.</p>:<div className="divide-y">{orders.map(order=><div key={order.order_number} className="flex flex-wrap items-center justify-between gap-3 p-6">
        <div><p className="font-bold">{order.order_number}</p><p className="mt-1 text-xs text-gray-500">{new Date(order.placed_at).toLocaleDateString("id-ID")}</p></div>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">{order.status}</span>
        <p className="font-bold">{new Intl.NumberFormat("id-ID",{style:"currency",currency:order.currency}).format(Number(order.total_amount))}</p>
      </div>)}</div>}
    </section>
  </div></main>;
}
