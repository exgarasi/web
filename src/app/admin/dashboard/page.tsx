import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const roles = user.roles as string[];
  if (!roles.includes("admin") && !roles.includes("super_admin")) redirect("/");
  const metrics = await withAuthenticatedDb(async (tx) => {
    const [sellers,listings,orders] = await Promise.all([
      tx`select count(*)::int as count from public.stores where store_type='partner'`,
      tx`select count(*)::int as count from public.listings`,
      tx`select count(*)::int as count from public.orders`,
    ]);
    return [["Partner stores",sellers[0].count],["Listings",listings[0].count],["Orders",orders[0].count]];
  });
  return <main className="min-h-screen bg-gray-50 px-6 py-12"><div className="mx-auto max-w-6xl">
    <p className="text-xs font-bold tracking-[.25em] text-sky-600">EXGARASI CONTROL CENTER</p><h1 className="mt-2 text-3xl font-black">Admin dashboard</h1><p className="mt-2 text-sm text-gray-500">{user.full_name} · {user.email}</p>
    <div className="mt-8 grid gap-4 md:grid-cols-3">{metrics.map(([label,value])=><section key={label} className="rounded-2xl border bg-white p-6"><p className="text-sm text-gray-500">{label}</p><p className="mt-3 text-4xl font-black">{value}</p></section>)}</div>
    <section className="mt-8 rounded-2xl border bg-white p-6"><h2 className="font-bold">Seller invitations</h2><p className="mt-2 text-sm text-gray-500">Protected endpoint: POST /api/admin/seller-invitations. Configure transactional email before production.</p></section>
  </div></main>;
}
