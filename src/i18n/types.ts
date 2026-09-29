export const APP_LOCALES = ["zh-CN", "zh-Hant", "en"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const LANGUAGE_OPTIONS: ReadonlyArray<{
  locale: AppLocale;
  label: string;
  shortLabel: string;
}> = [
  { locale: "zh-CN", label: "简体中文", shortLabel: "简" },
  { locale: "zh-Hant", label: "繁體中文", shortLabel: "繁" },
  { locale: "en", label: "English", shortLabel: "EN" },
];

export function isAppLocale(value: string | undefined): value is AppLocale {
  return value !== undefined && APP_LOCALES.some((locale) => locale === value);
}

export function normalizeLocale(language: string | undefined): AppLocale | undefined {
  if (!language) {
    return undefined;
  }

  const [languageCode, ...subtags] = language.replaceAll("_", "-").toLowerCase().split("-");

  if (languageCode === "en") {
    return "en";
  }

  if (languageCode !== "zh") {
    return undefined;
  }

  const region = subtags[0];
  if (subtags.includes("hant") || ["tw", "hk", "mo"].includes(region ?? "")) {
    return "zh-Hant";
  }

  return "zh-CN";
}