import { normalizeLocale, type AppLocale } from "./types";

const STORAGE_KEY = "huarongdao.locale";

export function getInitialLocale(): AppLocale {
  const storedLocale = readStoredLocale();
  if (storedLocale.status === "valid") {
    return storedLocale.locale;
  }
  if (storedLocale.status === "invalid") {
    return "zh-CN";
  }

  if (typeof navigator !== "undefined") {
    const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const candidate of candidates) {
      const locale = normalizeLocale(candidate);
      if (locale) {
        return locale;
      }
    }
  }

  return "zh-CN";
}

export function saveLocalePreference(locale: AppLocale): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, locale);
    }
  } catch {
    // The game remains usable when browser storage is unavailable.
  }
}

type StoredLocale =
  | { status: "missing" }
  | { status: "valid"; locale: AppLocale }
  | { status: "invalid" };

function readStoredLocale(): StoredLocale {
  try {
    if (typeof window === "undefined") {
      return { status: "missing" };
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      return { status: "missing" };
    }

    const locale = normalizeLocale(stored);
    return locale ? { status: "valid", locale } : { status: "invalid" };
  } catch {
    return { status: "missing" };
  }
}
