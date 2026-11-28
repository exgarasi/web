"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, CarFront, Search, ShieldCheck, Sparkles, Store, Tag } from "lucide-react";
import { useLocale, LanguageSwitcher, CurrencySwitcher } from "@/components/locale-provider";

const copy = {
  id: {
    eyebrow: "THE AUTOMOTIVE MARKETPLACE",
    headlineA: "Temukan bagian",
    headlineB: "terbaik dari",
    headlineC: "dunia otomotif.",
    sub: "Satu destinasi untuk diecast, parts, aksesori, dan kultur otomotif. Jelajahi pilihan dari EXGARASI Official dan partner terkurasi.",
    search: "Cari produk, merek, atau SKU...",
    explore: "Jelajahi marketplace",
    partner: "Jadi partner",
    curated: "Pilihan terkurasi",
    secure: "Transaksi lebih terarah",
    community: "Dibangun untuk enthusiast",
    categories: "Jelajahi kategori",
    categorySub: "Dari koleksi personal sampai kebutuhan garasi. Temukan yang sedang kamu cari.",
    all: "Lihat semua kategori",
    latest: "Temukan pilihanmu",
    latestSub: "Satu tempat untuk menemukan item otomotif yang tepat.",
    browse: "Buka katalog",
    official: "EXGARASI OFFICIAL",
    officialSub: "Koleksi pilihan dari toko resmi EXGARASI.",
    partnerTitle: "Punya toko otomotif?",
    partnerSub: "Kembangkan bisnis bersama ekosistem EXGARASI. Daftarkan toko dan ajukan produk untuk ditinjau.",
    apply: "Pelajari kemitraan",
    footer: "Marketplace otomotif untuk para enthusiast.",
    signIn: "Masuk",
    register: "Buat akun",
    menu: "Menu",
    view: "Jelajahi",
  },
  en: {
    eyebrow: "THE AUTOMOTIVE MARKETPLACE",
    headlineA: "Find your next",
    headlineB: "piece of the",
    headlineC: "automotive world.",
    sub: "One destination for diecast, parts, accessories, and automotive culture. Explore selections from EXGARASI Official and curated partners.",
    search: "Search products, brands, or SKU...",
    explore: "Explore marketplace",
    partner: "Become a partner",
    curated: "Curated selections",
    secure: "A clearer way to transact",
    community: "Built for enthusiasts",
    categories: "Explore categories",
    categorySub: "From personal collections to garage essentials. Find what moves you.",
    all: "View all categories",
    latest: "Find your next favorite",
    latestSub: "One place to discover the right automotive pieces.",
    browse: "Open catalog",
    official: "EXGARASI OFFICIAL",
    officialSub: "Selected collections from the official EXGARASI store.",
    partnerTitle: "Own an automotive store?",
    partnerSub: "Grow your business with the EXGARASI ecosystem. Register your store and submit products for review.",
    apply: "Explore partnership",
    footer: "The automotive marketplace for enthusiasts.",
    signIn: "Sign in",
    register: "Create account",
    menu: "Menu",
    view: "Explore",
  },
};

const categories = [
  { no: "01", name: "Diecast & Collectibles", slug: "diecast", desc: "Miniatures, model cars, limited editions", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1000&q=85", position: "center" },
  { no: "02", name: "Automotive Parts", slug: "suku-cadang", desc: "Wheels, performance, body and more", image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1000&q=85", position: "center" },
  { no: "03", name: "Accessories", slug: "aksesori-otomotif", desc: "Interior, exterior, audio and car care", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=85", position: "center" },
  { no: "04", name: "Automotive Lifestyle", slug: "lifestyle-otomotif", desc: "Tools, apparel and garage culture", image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1000&q=85", position: "center" },
];

export default function HomePage() {
  const { locale } = useLocale();
  const t = copy[locale];
  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#111318]">
      <div className="border-b border-[#e9edf2] bg-[#f7f9fc]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-2 text-[10px] font-semibold tracking-[.12em] text-[#697586] sm:px-8 lg:px-12">
          <span>EXGARASI / {t.eyebrow}</span>
          <span className="hidden sm:block">INDONESIA · EST. 2026</span>
          <span className="flex items-center gap-1 text-[#008fe8]"><span className="h-1.5 w-1.5 rounded-full bg-[#0099ff]" /> {locale === "id" ? "EKOSISTEM OTOMOTIF" : "AUTOMOTIVE ECOSYSTEM"}</span>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-[#edf0f3] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111318] text-[13px] font-black tracking-[-.08em] text-white">EX</span>
            <span className="text-[19px] font-black tracking-[.16em]">EXGARASI<span className="text-[#0099ff]">.</span></span>
          </Link>
          <nav className="hidden items-center gap-9 text-[13px] font-semibold text-[#596273] lg:flex">
            <Link href="/catalog" className="transition hover:text-[#0099ff]">{locale === "id" ? "Marketplace" : "Marketplace"}</Link>
            <a href="#categories" className="transition hover:text-[#0099ff]">{locale === "id" ? "Kategori" : "Categories"}</a>
            <a href="#official" className="transition hover:text-[#0099ff]">Official Store</a>
            <a href="#partners" className="transition hover:text-[#0099ff]">{locale === "id" ? "Kemitraan" : "Partnership"}</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block"><LanguageSwitcher /></div>
            <div className="hidden md:block"><CurrencySwitcher /></div>
            <Link href="/sign-in" className="hidden min-h-10 items-center justify-center whitespace-nowrap rounded-full px-4 py-2.5 text-[12px] font-bold leading-none text-[#4b5563] transition hover:bg-[#f3f6fa] sm:inline-flex">{t.signIn}</Link>
            <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-[#111318] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#0099ff]">{t.register}<ArrowUpRight size={14}/></Link>
          </div>
        </div>
      </header>

      <section className="relative isolate bg-[#0c1118] text-white">
        <div className="absolute inset-0 -z-20 bg-cover bg-[center_58%] opacity-[.58]" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2400&q=90')" }} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#080d13] via-[#0a1119]/90 to-[#0a1119]/30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b1118] via-transparent to-[#0b1118]/20" />
        <div className="mx-auto grid min-h-[660px] max-w-[1440px] items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:px-12 lg:py-28">
          <div className="max-w-[700px]">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3.5 py-2 text-[10px] font-bold tracking-[.19em] text-[#cbd5e1] backdrop-blur"><Sparkles size={12} className="text-[#38aaff]"/>{t.eyebrow}</div>
            <h1 className="text-[clamp(3.2rem,7vw,6.6rem)] font-semibold leading-[.99] tracking-[-.065em]">{t.headlineA}<br/>{t.headlineB}<br/><span className="text-[#43b2ff]">{t.headlineC}</span></h1>
            <p className="mt-8 max-w-[560px] text-[15px] leading-7 text-[#c0c9d4] sm:text-[17px] sm:leading-8">{t.sub}</p>
            <form action="/catalog" className="mt-10 flex max-w-[570px] items-center rounded-2xl border border-white/15 bg-white p-1.5 shadow-2xl shadow-black/20">
              <Search className="ml-4 shrink-0 text-[#7b8795]" size={18}/>
              <input name="q" placeholder={t.search} className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[13px] text-[#151a22] outline-none placeholder:text-[#98a2b3]" />
              <button className="flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#0099ff] px-5 text-[12px] font-bold leading-none !text-white transition hover:bg-[#007fd6]">{locale === "id" ? "Cari" : "Search"}<ArrowRight size={15}/></button>
            </form>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-[11px] font-medium text-[#c5cfda]">
              <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-[#45b6ff]"/>{t.curated}</span>
              <span className="flex items-center gap-2"><Tag size={14} className="text-[#45b6ff]"/>{t.secure}</span>
              <span className="flex items-center gap-2"><CarFront size={14} className="text-[#45b6ff]"/>{t.community}</span>
            </div>
          </div>
          <div className="hidden justify-end lg:flex">
            <div className="w-full max-w-[370px] rounded-[26px] border border-white/15 bg-[#101a25]/65 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-[.2em] text-[#c2ced9]">THE EXGARASI EDIT</span><span className="rounded-full bg-[#0099ff]/15 px-3 py-1.5 text-[9px] font-bold tracking-widest text-[#5dbdff]">VOL. 01</span></div>
              <div className="mt-6 overflow-hidden rounded-2xl bg-[#1b2733]">
                <div className="aspect-[1.18] bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=85')" }}/>
              </div>
              <div className="mt-5 flex items-end justify-between gap-4"><div><p className="text-[9px] font-bold tracking-[.2em] text-[#6dbfff]">CURATED AUTOMOTIVE</p><p className="mt-2 text-xl font-semibold tracking-tight">Driven by passion.</p></div><ArrowUpRight className="mb-1 text-[#56baff]" size={21}/></div>
              <div className="mt-5 h-px bg-white/10"/><p className="mt-4 text-[11px] leading-5 text-[#a8b5c2]">{locale === "id" ? "Tempat bertemunya koleksi, performa, dan gaya hidup otomotif." : "Where collections, performance, and automotive lifestyle meet."}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 bg-black/15">
          <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-5 px-5 py-6 sm:px-8 md:grid-cols-4 lg:px-12">
            {[["01","DIECAST"],["02","PARTS"],["03","ACCESSORIES"],["04","LIFESTYLE"]].map(([n,label])=><div key={n} className="flex items-center gap-3"><span className="text-[10px] font-bold text-[#4eb7ff]">{n}</span><span className="text-[10px] font-bold tracking-[.2em] text-white/75">{label}</span></div>)}
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><p className="text-[10px] font-bold tracking-[.25em] text-[#0099ff]">01 / EXPLORE</p><h2 className="mt-4 max-w-[620px] text-4xl font-semibold leading-[1.08] tracking-[-.045em] sm:text-5xl">{t.categories}<span className="text-[#0099ff]">.</span></h2><p className="mt-4 max-w-[500px] text-sm leading-7 text-[#778293]">{t.categorySub}</p></div>
          <Link href="/catalog" className="inline-flex items-center gap-2 self-start rounded-full border border-[#dce2e9] px-5 py-3 text-[11px] font-bold transition hover:border-[#0099ff] hover:text-[#0099ff] md:self-auto">{t.all}<ArrowUpRight size={14}/></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((item)=><Link key={item.no} href={`/catalog?category=${item.slug}`} className="group relative isolate min-h-[340px] overflow-hidden rounded-[22px] bg-[#131b25] text-white">
            <div aria-hidden="true" className="absolute inset-0 z-0 bg-cover bg-center transition duration-700 group-hover:scale-105" style={{backgroundImage:`url('${item.image}')`,backgroundPosition:item.position}}/>
            <div aria-hidden="true" className="absolute inset-0 z-10 bg-gradient-to-t from-[#080d13] via-[#080d13]/55 to-[#080d13]/10"/>
            <div className="relative z-20 flex h-full min-h-[340px] flex-col justify-between p-6 text-white"><div className="flex items-start justify-between"><span className="text-[10px] font-bold tracking-[.2em] text-white/85">{item.no} / CATEGORY</span><span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/45 text-white transition group-hover:border-[#0099ff] group-hover:bg-[#0099ff]"><ArrowUpRight size={16}/></span></div><div><h3 className="text-[22px] font-bold leading-tight tracking-tight text-white [text-shadow:0_1px_12px_rgba(0,0,0,.35)]">{item.name}</h3><p className="mt-2 max-w-[240px] text-[11px] leading-5 text-white/85">{item.desc}</p></div></div>
          </Link>)}
        </div>
      </section>

      <section id="official" className="border-y border-[#edf0f3] bg-[#f7f9fc]">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:px-12 lg:py-28">
          <div><p className="text-[10px] font-bold tracking-[.25em] text-[#0099ff]">02 / OFFICIAL STORE</p><h2 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-[-.05em] sm:text-5xl">{t.official}<span className="text-[#0099ff]">.</span></h2><p className="mt-5 max-w-[430px] text-sm leading-7 text-[#778293]">{t.officialSub}</p><Link href="/catalog" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#111318] px-6 py-3.5 text-[12px] font-bold leading-none !text-white transition hover:bg-[#0099ff]"><span>{t.browse}</span><ArrowRight size={15}/></Link></div>
          <div className="relative overflow-hidden rounded-[26px] bg-[#111a24] p-7 text-white sm:p-10">
            <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border border-white/10"/><div className="absolute -right-5 -top-16 h-56 w-56 rounded-full border border-white/10"/>
            <div className="relative"><div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-[.22em] text-[#8d9baa]">EXGARASI / SELECTED</span><span className="rounded-full bg-[#0099ff]/15 px-3 py-1.5 text-[9px] font-bold text-[#5dbdff]">OFFICIAL</span></div><div className="mt-14 grid grid-cols-2 gap-4"><div className="rounded-2xl border border-white/10 bg-white/[.05] p-5"><Store size={19} className="text-[#52b7ff]"/><p className="mt-7 text-sm font-semibold">{locale==="id"?"Toko resmi":"Official store"}</p><p className="mt-1 text-[10px] text-[#9ba8b6]">{locale==="id"?"Dikelola EXGARASI":"Operated by EXGARASI"}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.05] p-5"><ShieldCheck size={19} className="text-[#52b7ff]"/><p className="mt-7 text-sm font-semibold">{locale==="id"?"Kurasi produk":"Product review"}</p><p className="mt-1 text-[10px] text-[#9ba8b6]">{locale==="id"?"Produk melalui proses tinjauan":"Products go through review"}</p></div></div></div>
          </div>
        </div>
      </section>

      <section id="partners" className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="relative overflow-hidden rounded-[28px] bg-[#0e151e] px-7 py-14 text-white sm:px-12 lg:px-16 lg:py-16">
          <div className="absolute -right-24 -top-40 h-[500px] w-[500px] rounded-full border border-white/[.08]"/><div className="absolute -right-5 -top-24 h-[350px] w-[350px] rounded-full border border-white/[.08]"/>
          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-[10px] font-bold tracking-[.25em] text-[#55baff]">03 / PARTNER NETWORK</p><h2 className="mt-4 max-w-[650px] text-4xl font-semibold leading-[1.08] tracking-[-.05em] sm:text-5xl">{t.partnerTitle}</h2><p className="mt-5 max-w-[570px] text-sm leading-7 text-[#aab6c3]">{t.partnerSub}</p></div><Link href="/sign-up" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0099ff] px-7 py-4 text-[11px] font-bold text-white transition hover:bg-white hover:text-[#111318]">{t.apply}<ArrowUpRight size={15}/></Link></div>
        </div>
      </section>

      <footer className="border-t border-[#e9edf2] bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center lg:px-12">
          <div><Link href="/" className="text-[17px] font-black tracking-[.18em]">EXGARASI<span className="text-[#0099ff]">.</span></Link><p className="mt-2 text-[11px] text-[#8792a1]">{t.footer}</p></div>
          <div className="flex flex-wrap items-center gap-5 text-[11px] font-semibold text-[#667085]"><Link href="/catalog" className="hover:text-[#0099ff]">Marketplace</Link><Link href="/sign-in" className="hover:text-[#0099ff]">{t.signIn}</Link><Link href="/sign-up" className="hover:text-[#0099ff]">{t.register}</Link><LanguageSwitcher/><CurrencySwitcher/></div>
          <p className="text-[10px] text-[#9aa3af]">© {new Date().getFullYear()} EXGARASI. {locale==="id"?"Hak cipta dilindungi.":"All rights reserved."}</p>
        </div>
      </footer>
    </main>
  );
}
