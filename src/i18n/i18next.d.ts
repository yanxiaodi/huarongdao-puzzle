import "i18next";
import type { TranslationResource } from "./resources";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: TranslationResource;
    };
    returnNull: false;
  }
}