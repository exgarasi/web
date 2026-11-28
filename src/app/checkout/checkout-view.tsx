"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Address = {
  id: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  village: string | null;
  district: string | null;
  city: string;
  province: string;
  postal_code: string | null;
  is_default: boolean;
};
type CheckoutData = {
  addresses: Address[];
  cart: { item_count: number; subtotal: string; currency: string | null; currency_count: number; available: boolean };
};
type AddressForm = {
  recipientName: string; phone: string; addressLine: string; village: string;
  district: string; city: string; province: string; postalCode: string; isDefault: boolean;
};
const emptyAddress: AddressForm = {
  recipientName: "", phone: "", addressLine: "", village: "", district: "",
  city: "", province: "", postalCode: "", isDefault: true,
};
const money = (amount: number, currency: string) => new Intl.NumberFormat(
  currency === "USD" ? "en-US" : "id-ID",
  { style: "currency", currency, maximumFractionDigits: currency === "IDR" ? 0 : 2 },
).format(amount);

export function CheckoutView() {
  const router = useRouter();
  const [data, setData] = useState<CheckoutData | null>(null);
  const [addressId, setAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"manual_bank_transfer" | "manual_qris">("manual_bank_transfer");
  const [form, setForm] = useState<AddressForm>(emptyAddress);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<{ order_id: string; order_number: string; total_amount: number; currency: string; shipping_pending: boolean } | null>(null);
  const idempotencyKey = useRef("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/checkout", { cache: "no-store" });
      if (response.status === 401) { router.replace("/sign-in?callbackURL=%2Fcheckout"); return; }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gagal memuat checkout.");
      setData(payload);
      const defaultAddress = payload.addresses?.find((item: Address) => item.is_default) ?? payload.addresses?.[0];
      if (defaultAddress) setAddressId(defaultAddress.id);
      else setShowForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
  }, [router]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function saveAddress() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/addresses", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gagal menyimpan alamat.");
      setShowForm(false);
      setForm(emptyAddress);
      await load();
      setAddressId(payload.address.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan alamat.");
    } finally { setBusy(false); }
  }

  async function placeOrder() {
    if (!addressId) { setError("Pilih alamat pengiriman terlebih dahulu."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId, paymentMethod, idempotencyKey: idempotencyKey.current || (idempotencyKey.current = crypto.randomUUID()) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gagal membuat pesanan.");
      setOrder(payload.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pesanan.");
    } finally { setBusy(false); }
  }

  if (order) return <main className="mx-auto max-w-2xl rounded-3xl border border-[#e5eaf0] bg-white p-8 text-center">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-600">✓</div>
    <p className="mt-5 text-xs font-bold uppercase tracking-[.22em] text-[#168cf0]">Pesanan dibuat</p>
    <h1 className="mt-2 text-2xl font-black">{order.order_number}</h1>
    <p className="mt-3 text-sm text-[#667085]">Total sementara {money(Number(order.total_amount), order.currency)}.</p>
    <p className="mt-2 rounded-2xl bg-amber-50 p-4 text-left text-sm leading-6 text-amber-900">
      Ongkos kirim belum termasuk. Admin EXGARASI perlu mengonfirmasi biaya pengiriman sebelum pembayaran dilakukan. Pesanan ini masih berstatus menunggu pembayaran.
    </p>
    <Link href="/catalog" className="mt-6 inline-flex rounded-full bg-[#168cf0] px-6 py-3 text-sm font-bold text-white">Kembali ke marketplace</Link>
  </main>;

  if (!data) return <div className="rounded-3xl border bg-white p-12 text-center text-sm text-[#667085]">Memuat checkout...</div>;
  const currency = data.cart.currency || "IDR";
  const cartReady = data.cart.item_count > 0 && data.cart.currency_count === 1 && data.cart.available;

  return <main className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_340px]">
    <section className="space-y-5">
      <div className="rounded-3xl border border-[#e5eaf0] bg-white p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#168cf0]">01 · Pengiriman</p><h1 className="mt-2 text-xl font-black">Alamat pengiriman</h1></div>
          <button onClick={() => setShowForm(!showForm)} className="rounded-full border px-4 py-2 text-xs font-bold">{showForm ? "Tutup" : "Tambah alamat"}</button></div>
        {data.addresses.length > 0 && !showForm && <div className="mt-5 space-y-3">{data.addresses.map(address => <label key={address.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${addressId === address.id ? "border-[#168cf0] bg-[#f2f8ff]" : "border-[#e5eaf0]"}`}>
          <input type="radio" name="address" checked={addressId === address.id} onChange={() => setAddressId(address.id)} />
          <span className="min-w-0 text-sm"><strong>{address.recipient_name}</strong> · {address.phone}<span className="mt-1 block text-[#667085]">{address.address_line}{address.village ? ", "+address.village : ""}{address.district ? ", "+address.district : ""}, {address.city}, {address.province} {address.postal_code || ""}</span></span>
        </label>)}</div>}
        {showForm && <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {([
            ["recipientName","Nama penerima"],["phone","Nomor WhatsApp/telepon"],["addressLine","Alamat lengkap"],["village","Kelurahan/desa"],["district","Kecamatan"],["city","Kota/kabupaten"],["province","Provinsi"],["postalCode","Kode pos"],
          ] as const).map(([key,label]) => <label key={key} className={`text-xs font-semibold text-[#475467] ${key === "addressLine" ? "sm:col-span-2" : ""}`}>{label}<input value={form[key]} onChange={e=>setForm(old=>({...old,[key]:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-[#d0d5dd] px-3 py-2.5 text-sm outline-none focus:border-[#168cf0]" /></label>)}
          <button disabled={busy} onClick={()=>void saveAddress()} className="rounded-full bg-[#168cf0] px-5 py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">Simpan alamat</button>
        </div>}
      </div>
      <div className="rounded-3xl border border-[#e5eaf0] bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#168cf0]">02 · Pembayaran</p><h2 className="mt-2 text-xl font-black">Pilih metode pembayaran</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className={`cursor-pointer rounded-2xl border p-4 ${paymentMethod === "manual_bank_transfer" ? "border-[#168cf0] bg-[#f2f8ff]" : "border-[#e5eaf0]"}`}><input type="radio" name="payment" checked={paymentMethod==="manual_bank_transfer"} onChange={()=>setPaymentMethod("manual_bank_transfer")} /> <strong className="ml-2 text-sm">Transfer bank</strong><span className="mt-2 block text-xs text-[#667085]">Konfirmasi manual oleh admin</span></label>
          <label className={`cursor-pointer rounded-2xl border p-4 ${paymentMethod === "manual_qris" ? "border-[#168cf0] bg-[#f2f8ff]" : "border-[#e5eaf0]"}`}><input type="radio" name="payment" checked={paymentMethod==="manual_qris"} onChange={()=>setPaymentMethod("manual_qris")} /> <strong className="ml-2 text-sm">QRIS</strong><span className="mt-2 block text-xs text-[#667085]">Konfirmasi manual oleh admin</span></label>
        </div>
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Instruksi rekening dan QRIS akan ditampilkan setelah data pembayaran EXGARASI dikonfigurasi. Jangan melakukan transfer sebelum menerima instruksi resmi.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </section>
    <aside className="h-fit rounded-3xl border border-[#e5eaf0] bg-white p-6">
      <h2 className="font-bold">Ringkasan pesanan</h2>
      <div className="mt-5 flex justify-between text-sm text-[#667085]"><span>Produk ({data.cart.item_count} item)</span><strong className="text-[#202733]">{money(Number(data.cart.subtotal),currency)}</strong></div>
      <div className="mt-3 flex justify-between text-sm text-[#667085]"><span>Ongkos kirim</span><span>Dikonfirmasi admin</span></div>
      <div className="my-5 border-t" />
      <div className="flex justify-between"><strong>Total sementara</strong><strong>{money(Number(data.cart.subtotal),currency)}</strong></div>
      <button disabled={!cartReady || !addressId || busy || showForm} onClick={()=>void placeOrder()} className="mt-6 w-full rounded-full bg-[#168cf0] px-5 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? "Memproses..." : "Buat pesanan"}</button>
      {!cartReady && <p className="mt-3 text-xs leading-5 text-amber-700">Keranjang kosong, mata uang tercampur, atau ada produk yang tidak tersedia.</p>}
      <Link href="/cart" className="mt-4 block text-center text-xs font-semibold text-[#667085]">Kembali ke keranjang</Link>
    </aside>
  </main>;
}
