import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { withAuthenticatedDb } from "@/lib/db-context";
import { AccountHeader } from "@/components/account-header";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BuyerDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const orders = await withAuthenticatedDb((tx) => tx`
    select order_number,status,total_amount,currency,placed_at from public.orders
    where buyer_user_id=${user.id}::uuid order by placed_at desc limit 20
  `);
  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#111827]">
      <AccountHeader name={user.full_name || "EXGARASI member"} email={user.email} roles={user.roles as string[]} active="account" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="rounded-3xl border border-[#e5eaf0] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[10px] font-bold tracking-[.24em] text-[#008fe8]">AKUN EXGARASI</p>
          <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#111318]">Akun saya</h1>
              <p className="mt-2 text-sm text-[#667085]">{user.full_name} <span className="px-1 text-[#c2cad4]">·</span> {user.email}</p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-[#b9e3ff] bg-[#eff8ff] px-3 py-1.5 text-[11px] font-bold text-[#006fbd]">Akun pembeli</span>
          </div>
        </div>
        <section className="mt-6 overflow-hidden rounded-2xl border border-[#e1e7ee] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e8edf2] px-6 py-5">
            <div>
              <h2 className="font-bold text-[#202733]">Riwayat pesanan</h2>
              <p className="mt-1 text-xs text-[#7b8794]">Pantau pesanan yang Anda buat di EXGARASI.</p>
            </div>
          </div>
          {orders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-[#344054]">Belum ada pesanan</p>
              <p className="mt-1 text-xs text-[#7b8794]">Pesanan Anda akan muncul di sini setelah checkout.</p>
              <Link href="/catalog" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0099ff] px-5 text-xs font-bold text-white transition hover:bg-[#0077cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0099ff] focus-visible:ring-offset-2">Jelajahi marketplace</Link>
            </div>
          ) : (
            <div className="divide-y divide-[#edf0f4]">
              {orders.map((order) => (
                <div key={order.order_number} className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
                  <div><p className="font-bold text-[#202733]">{order.order_number}</p><p className="mt-1 text-xs text-[#7b8794]">{new Date(order.placed_at).toLocaleDateString("id-ID")}</p></div>
                  <span className="rounded-full border border-[#b9e3ff] bg-[#eff8ff] px-3 py-1 text-xs font-bold text-[#006fbd]">{order.status}</span>
                  <p className="font-bold text-[#111318]">{new Intl.NumberFormat("id-ID", { style: "currency", currency: order.currency }).format(Number(order.total_amount))}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
