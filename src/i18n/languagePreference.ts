import { normalizeLocale, type AppLocale } from "./types";

const STORAGE_KEY = "huarongdao.locale";

export function getInitialLocale(): AppLocale {
  const storedLocale = readStoredLocale();
  if (storedLocale) {
    return storedLocale;
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

function readStoredLocale(): AppLocale | undefined {
  try {
    if (typeof window === "undefined") {
      return undefined;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    return normalizeLocale(stored ?? undefined);
  } catch {
    return undefined;
  }
}