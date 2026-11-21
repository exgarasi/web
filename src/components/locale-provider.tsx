"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "id" | "en";
type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; toggleLocale: () => void };
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("id");

  useEffect(() => {
    const saved = window.localStorage.getItem("exgarasi-locale");
    if (saved === "id" || saved === "en") setLocaleState(saved);
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem("exgarasi-locale", next);
  };
  const value = useMemo(() => ({
    locale,
    setLocale,
    toggleLocale: () => setLocale(locale === "id" ? "en" : "id"),
  }), [locale]);

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
