import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/theme.css";
import i18n, { i18nReady } from "./i18n";
import { normalizeLocale } from "./i18n/types";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing #root element");
}

const root = createRoot(rootElement);

function syncDocumentLanguage(language: string) {
  const locale = normalizeLocale(language) ?? "zh-CN";
  document.documentElement.lang = locale;
  document.title = i18n.t("app.title", { lng: locale });
  document
    .querySelector<HTMLMetaElement>('meta[name="description"]')
    ?.setAttribute("content", i18n.t("app.description", { lng: locale }));
}

void i18nReady.then(() => {
  syncDocumentLanguage(i18n.resolvedLanguage ?? "zh-CN");
  i18n.on("languageChanged", syncDocumentLanguage);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});