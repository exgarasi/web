"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Locale = "id" | "en";
export type Currency = "IDR" | "USD";
type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (amountInIDR: number) => string;
  exchangeRate: number | null;
};
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("id");
  const [currency, setCurrencyState] = useState<Currency>("IDR");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("exgarasi-locale");
    const savedCurrency = window.localStorage.getItem("exgarasi-currency");
    queueMicrotask(() => {
      if (savedLocale === "id" || savedLocale === "en") setLocaleState(savedLocale);
      if (savedCurrency === "IDR" || savedCurrency === "USD") setCurrencyState(savedCurrency);
    });

    const controller = new AbortController();
    fetch("https://open.er-api.com/v6/latest/IDR", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Exchange rate request failed");
        return response.json();
      })
      .then((data: { result?: string; rates?: { USD?: number } }) => {
        const rate = data.result === "success" ? data.rates?.USD : undefined;
        if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) setExchangeRate(rate);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem("exgarasi-locale", next);
  };
  const setCurrency = (next: Currency) => {
    setCurrencyState(next);
    window.localStorage.setItem("exgarasi-currency", next);
  };
  const formatPrice = (amountInIDR: number) => {
    if (currency === "USD") {
      if (exchangeRate === null) return "USD —";
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amountInIDR * exchangeRate);
    }
    return new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amountInIDR);
  };

  const value: LocaleContextValue = {
    locale,
    setLocale,
    toggleLocale: () => setLocale(locale === "id" ? "en" : "id"),
    currency,
    setCurrency,
    formatPrice,
    exchangeRate,
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}

export function LanguageSwitcher() {
  const { locale, toggleLocale } = useLocale();
  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={locale === "id" ? "Switch language to English" : "Ganti bahasa ke Indonesia"}
      className="rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-sky-500 hover:text-sky-600"
    >
      {locale === "id" ? "🇮🇩 ID" : "🇬🇧 EN"}
    </button>
  );
}

export function CurrencySwitcher() {
  const { currency, setCurrency } = useLocale();
  return (
    <div className="flex items-center rounded-full border border-gray-300 bg-white p-1" aria-label="Pilih mata uang">
      {(["IDR", "USD"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setCurrency(item)}
          aria-pressed={currency === item}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${currency === item ? "bg-gray-950 text-white" : "text-gray-600 hover:text-sky-600"}`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
