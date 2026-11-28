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
    const savedCurrency = window.localStorage.getItem("exgarasi-currency");
    // Restore browser preferences after hydration to avoid server/client markup mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedCurrency === "IDR" || savedCurrency === "USD") setCurrencyState(savedCurrency);

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
    setLocaleState("id");
    window.localStorage.removeItem("exgarasi-locale");
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
  return null;
}

export function CurrencySwitcher() {
  const { currency, setCurrency } = useLocale();
  return (
    <div className="inline-flex min-h-10 items-center gap-0.5 rounded-full border border-[#e1e7ee] bg-white p-1" aria-label="Pilih mata uang">
      {(["IDR", "USD"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setCurrency(item)}
          aria-pressed={currency === item}
          className={`inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-full px-3 text-[11px] font-bold leading-none transition ${currency === item ? "bg-[#111318] text-white" : "text-[#667085] hover:text-[#0099ff]"}`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
