import { redirect } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings2,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { withAuthenticatedDb } from "@/lib/db-context";
import { SellerInviteForm } from "./invite-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const navigation = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, active: true },
  { label: "Katalog produk", href: "/admin/catalog", icon: Package },
  { label: "Inventaris", icon: Boxes, soon: true },
  { label: "Penjualan", icon: ShoppingBag, soon: true },
  { label: "Pesanan", icon: ClipboardList, soon: true },
  { label: "Pelanggan", icon: Users, soon: true },
  { label: "Partner seller", icon: Store, soon: true },
];

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ElementType;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/70">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">{value.toLocaleString("id-ID")}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <Icon size={19} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-4 text-xs text-gray-400">{helper}</p>
    </section>
  );
}

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const roles = user.roles as string[];
  if (!roles.includes("admin") && !roles.includes("super_admin")) redirect("/");

  const metrics = await withAuthenticatedDb(async (tx) => {
    const [sellers, listings, orders] = await Promise.all([
      tx`select count(*)::int as count from public.stores where store_type = 'partner'`,
      tx`select count(*)::int as count from public.listings`,
      tx`select count(*)::int as count from public.orders`,
    ]);
    return {
      sellers: Number(sellers[0]?.count ?? 0),
      listings: Number(listings[0]?.count ?? 0),
      orders: Number(orders[0]?.count ?? 0),
    };
  });

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-gray-950 lg:flex">
      <aside className="border-b border-gray-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0099ff] text-sm font-black text-white">EX</div>
          <div>
            <p className="text-sm font-bold tracking-wide">EXGARASI</p>
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-gray-400">Control Center</p>
          </div>
        </div>
        <div className="px-4 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-gray-400">Workspace</p>
          <nav className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return item.active ? (
                <a key={item.label} href={item.href} className="flex items-center gap-3 rounded-xl bg-sky-50 px-3 py-2.5 text-sm font-semibold text-[#0088e6]">
                  <Icon size={17} />{item.label}
                </a>
              ) : item.href ? (
                <a key={item.label} href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-sky-50 hover:text-sky-700">
                  <Icon size={17} />{item.label}
                </a>
              ) : (
                <div key={item.label} aria-disabled="true" title="Segera hadir" className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-400">
                  <span className="flex items-center gap-3"><Icon size={17} />{item.label}</span>
                  <span className="hidden text-[9px] font-semibold uppercase tracking-wider lg:inline">Soon</span>
                </div>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto hidden border-t border-gray-100 p-4 lg:block">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
              {(user.full_name || user.email || "A").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{user.full_name || "Administrator"}</p>
              <p className="truncate text-[10px] text-gray-500">{user.email}</p>
            </div>
            <Settings2 size={15} className="ml-auto shrink-0 text-gray-400" />
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-5 sm:px-8">
          <div>
            <p className="text-xs text-gray-400">EXGARASI / Admin</p>
            <p className="mt-0.5 text-sm font-semibold">Dashboard overview</p>
          </div>
          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">System online</span>
        </header>

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0099ff]">Overview</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Selamat datang, {user.full_name || "Admin"}</h1>
              <p className="mt-2 text-sm text-gray-500">Pantau ekosistem EXGARASI dari satu tempat.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400"><Activity size={15} /> Data langsung dari database</div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Partner seller" value={metrics.sellers} helper="Jumlah toko partner terdaftar" icon={Store} />
            <MetricCard label="Product listings" value={metrics.listings} helper="Listing produk yang tercatat" icon={Package} />
            <MetricCard label="Total orders" value={metrics.orders} helper="Pesanan yang tercatat di sistem" icon={ShoppingBag} />
          </div>

          <div className="mt-7 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/70 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Langkah berikutnya</h2>
                  <p className="mt-1 text-xs text-gray-500">Fondasi operasional yang akan kita aktifkan bertahap.</p>
                </div>
                <span className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">Roadmap</span>
              </div>
              <div className="mt-5 divide-y divide-gray-100">
                {[
                  ["01", "Katalog & SKU", "Master produk, kategori otomotif, dan kode SKU"],
                  ["02", "Inventaris", "Stok tersedia, stok dipesan, dan mutasi barang"],
                  ["03", "Penjualan & invoice", "Transaksi, pembayaran, dan riwayat pelanggan"],
                  ["04", "Keuangan & laporan", "Arus kas, biaya, dan laporan laba rugi"],
                ].map(([number, title, description]) => (
                  <div key={number} className="flex items-start gap-4 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-xs font-bold text-gray-400">{number}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
                    </div>
                    <span className="mt-1 rounded-full bg-gray-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-gray-500">Planned</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/70 sm:p-6">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-[#0099ff]"><Store size={18} /></div>
                <div>
                  <h2 className="text-base font-semibold">Partner seller</h2>
                  <p className="text-xs text-gray-500">Undang mitra ke EXGARASI</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-500">Buat undangan untuk seller baru. Undangan berlaku selama tujuh hari dan hanya dapat digunakan oleh email yang dituju.</p>
              <SellerInviteForm />
              <div className="mt-5 flex items-center gap-2 border-t border-gray-100 pt-4 text-[11px] text-gray-400">
                <ArrowUpRight size={13} /> Persetujuan seller tetap melalui admin
              </div>
            </section>
          </div>

          <footer className="mt-8 flex flex-col gap-1 border-t border-gray-200 py-5 text-[11px] text-gray-400 sm:flex-row sm:items-center sm:justify-between">
            <span>EXGARASI Control Center</span>
            <span>Admin workspace · Development environment</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
