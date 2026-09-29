import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { getInitialLocale } from "./languagePreference";
import { TRANSLATIONS } from "./resources";
import { APP_LOCALES } from "./types";

const i18n = createInstance();

export const i18nReady = i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: TRANSLATIONS["zh-CN"] },
    "zh-Hant": { translation: TRANSLATIONS["zh-Hant"] },
    en: { translation: TRANSLATIONS.en },
  },
  lng: getInitialLocale(),
  fallbackLng: "zh-CN",
  supportedLngs: [...APP_LOCALES],
  defaultNS: "translation",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;