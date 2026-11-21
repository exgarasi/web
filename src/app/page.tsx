"use client";

import Link from "next/link";
import { LanguageSwitcher, useLocale } from "@/components/locale-provider";

export default function HomePage() {
  const { locale } = useLocale();
  const id = locale === "id";
  const categories = id
    ? [
        { number: "01", name: "Diecast & Koleksi", detail: "Miniatur, mobil model, edisi terbatas" },
        { number: "02", name: "Suku Cadang Otomotif", detail: "Velg, bodi, lampu, dan performa" },
        { number: "03", name: "Aksesori", detail: "Interior, eksterior, audio, perawatan mobil" },
        { number: "04", name: "Gaya Hidup Otomotif", detail: "Peralatan, pakaian, dan budaya garasi" },
      ]
    : [
        { number: "01", name: "Diecast & Collectibles", detail: "Miniatures, model cars, limited editions" },
        { number: "02", name: "Automotive Parts", detail: "Wheels, body kits, lighting, performance" },
        { number: "03", name: "Accessories", detail: "Interior, exterior, audio, car care" },
        { number: "04", name: "Automotive Lifestyle", detail: "Tools, apparel, and garage culture" },
      ];
  const highlights = id
    ? [{ label: "Penjual pilihan", value: "UNDANGAN" }, { label: "Model marketplace", value: "HIBRIDA" }, { label: "Fokus utama", value: "OTOMOTIF" }]
    : [{ label: "Curated sellers", value: "INVITE ONLY" }, { label: "Marketplace model", value: "HYBRID" }, { label: "Launch vertical", value: "AUTOMOTIVE" }];

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="text-xl font-black tracking-[0.22em]">EXGARASI<span className="text-sky-500">.</span></Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            <a href="#categories" className="hover:text-sky-600">{id ? "Kategori" : "Categories"}</a>
            <a href="#about" className="hover:text-sky-600">{id ? "Tentang" : "About"}</a>
            <a href="mailto:partner@exgarasi.com" className="hover:text-sky-600">{id ? "Menjadi Mitra" : "Become a Partner"}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/sign-in" className="rounded-full bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600">{id ? "Masuk" : "Sign In"}</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#101820] text-white">
        <div className="absolute -right-24 -top-32 h-[34rem] w-[34rem] rounded-full border border-white/10" />
        <div className="absolute -right-8 -top-16 h-[22rem] w-[22rem] rounded-full border border-white/10" />
        <div className="mx-auto grid max-w-7xl gap-14 px-6 py-24 md:grid-cols-[1.1fr_.9fr] md:items-center md:py-32">
          <div className="relative z-10">
            <p className="mb-6 text-xs font-bold tracking-[0.3em] text-sky-400">{id ? "MARKETPLACE OTOMOTIF" : "AUTOMOTIVE MARKETPLACE"}</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
              {id ? <>Temukan dunia<br /><span className="text-sky-400">otomotif</span> favoritmu.</> : <>Find your next<br /><span className="text-sky-400">automotive</span> obsession.</>}
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 md:text-lg">
              {id ? "Satu tempat untuk diecast, suku cadang, aksesori, dan koleksi otomotif dari EXGARASI Official maupun mitra pilihan." : "One destination for diecast, spare parts, accessories, and automotive collectibles from EXGARASI Official and selected partners."}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href="#categories" className="rounded-full bg-sky-500 px-7 py-3.5 text-sm font-bold text-white hover:bg-sky-400">{id ? "Jelajahi kategori" : "Explore categories"}</a>
              <a href="mailto:partner@exgarasi.com" className="rounded-full border border-white/25 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/10">{id ? "Daftar sebagai mitra" : "Apply as a partner"}</a>
            </div>
          </div>
          <div className="relative z-10 rounded-3xl border border-white/10 bg-white/[0.06] p-7 backdrop-blur">
            <div className="mb-8 flex items-center justify-between gap-3">
              <span className="text-xs font-bold tracking-[0.2em] text-slate-300">THE EXGARASI ECOSYSTEM</span>
              <span className="rounded-full bg-sky-400/15 px-3 py-1 text-[10px] font-bold tracking-wider text-sky-300">{id ? "UNTUK PENCINTA OTOMOTIF" : "BUILT FOR ENTHUSIASTS"}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["DIECAST", "PARTS", "ACCESSORIES", "LIFESTYLE"].map((item, i) => (
                <div key={item} className="flex aspect-[1.3] flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-5">
                  <span className="text-xs text-slate-400">0{i + 1}</span><span className="text-sm font-black tracking-[0.16em]">{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs leading-6 text-slate-400">{id ? "Koleksi resmi bertemu jaringan penjual otomotif pilihan." : "Official inventory meets a curated network of automotive sellers."}</p>
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div><p className="text-xs font-bold tracking-[0.25em] text-sky-600">{id ? "JELAJAHI EXGARASI" : "EXPLORE EXGARASI"}</p><h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">{id ? "Berawal dari budaya otomotif." : "Built around automotive culture."}</h2></div>
          <p className="max-w-md text-sm leading-7 text-gray-500">{id ? "Dari koleksi skala kecil hingga kebutuhan modifikasi kendaraan, semuanya dalam satu ekosistem." : "From scale collectibles to vehicle modification essentials, all in one ecosystem."}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map((category) => <article key={category.number} className="group rounded-2xl border border-gray-200 bg-white p-7 transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-950/5"><div className="flex items-start justify-between"><span className="text-xs font-bold tracking-widest text-sky-600">{category.number}</span><span className="text-2xl text-gray-300 transition group-hover:text-sky-500">↗</span></div><h3 className="mt-10 text-2xl font-extrabold">{category.name}</h3><p className="mt-2 text-sm text-gray-500">{category.detail}</p></article>)}
        </div>
      </section>

      <section id="about" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-[.8fr_1.2fr]">
          <div><p className="text-xs font-bold tracking-[0.25em] text-sky-600">{id ? "MENGAPA EXGARASI" : "WHY EXGARASI"}</p><h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{id ? "Marketplace dengan karakter." : "A marketplace with a point of view."}</h2></div>
          <div className="grid gap-7 sm:grid-cols-3">{highlights.map((item) => <div key={item.label} className="border-t-2 border-sky-500 pt-4"><p className="text-xs text-gray-500">{item.label}</p><p className="mt-3 text-lg font-black tracking-wide">{item.value}</p></div>)}</div>
        </div>
      </section>

      <footer className="bg-[#101820] px-6 py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><p className="font-black tracking-[0.2em]">EXGARASI<span className="text-sky-400">.</span></p><p className="mt-2 text-xs text-slate-400">{id ? "Marketplace otomotif untuk para pencinta otomotif." : "Automotive marketplace for enthusiasts."}</p></div>
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} EXGARASI. {id ? "Hak cipta dilindungi." : "All rights reserved."}</p>
        </div>
      </footer>
    </main>
  );
}
