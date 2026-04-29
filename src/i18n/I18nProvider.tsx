import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGUAGES, dictionaries, type LangCode, type TranslationKeys } from "./translations";

const STORAGE_KEY = "mastervpn.lang";

type Ctx = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  /**
   * Translate a key. Strict TranslationKeys are typed; arbitrary strings are
   * accepted (with optional `fallback`) so feature modules can ship new copy
   * without expanding every dictionary.
   */
  t: (key: keyof TranslationKeys | (string & {}), fallback?: string) => string;
  isRTL: boolean;
};

const I18nContext = createContext<Ctx | null>(null);

function detectInitial(): LangCode {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as LangCode | null;
    if (saved && dictionaries[saved]) return saved;
  } catch {}
  const nav = (typeof navigator !== "undefined" ? navigator.language : "en").slice(0, 2).toLowerCase() as LangCode;
  return dictionaries[nav] ? nav : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    setLangState(detectInitial());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const meta = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = meta?.rtl ? "rtl" : "ltr";
  }, [lang]);

  const value = useMemo<Ctx>(() => {
    const dict = dictionaries[lang] ?? dictionaries.en;
    return {
      lang,
      setLang: (l) => {
        setLangState(l);
        try { window.localStorage.setItem(STORAGE_KEY, l); } catch {}
      },
      t: (key, fallback) => {
        const k = key as keyof TranslationKeys;
        const v = (dict as Record<string, string>)[k] ?? (dictionaries.en as Record<string, string>)[k];
        return v ?? fallback ?? String(key);
      },
      isRTL: !!LANGUAGES.find((x) => x.code === lang)?.rtl,
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export { LANGUAGES };
