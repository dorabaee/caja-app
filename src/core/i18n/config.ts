import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { Locale } from "@core/model/types";

// Per-area fragment files. Each is { "<namespace>": { key: value } }; spreading
// merges the disjoint top-level namespaces into one "translation" bundle.
import commonEs from "./locales/common.es.json";
import commonEn from "./locales/common.en.json";
import shellEs from "./locales/shell.es.json";
import shellEn from "./locales/shell.en.json";
import monthEs from "./locales/month.es.json";
import monthEn from "./locales/month.en.json";
import widgetsEs from "./locales/widgets.es.json";
import widgetsEn from "./locales/widgets.en.json";
import dashEs from "./locales/dash.es.json";
import dashEn from "./locales/dash.en.json";
import modalsEs from "./locales/modals.es.json";
import modalsEn from "./locales/modals.en.json";
import tourEs from "./locales/tour.es.json";
import tourEn from "./locales/tour.en.json";

const es = { ...commonEs, ...shellEs, ...monthEs, ...widgetsEs, ...dashEs, ...modalsEs, ...tourEs };
const en = { ...commonEn, ...shellEn, ...monthEn, ...widgetsEn, ...dashEn, ...modalsEn, ...tourEn };

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: "es",
  fallbackLng: "es",
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Switch the active language (no-op when already active). */
export function setLocale(locale: Locale): void {
  if (i18n.language !== locale) void i18n.changeLanguage(locale);
}

export default i18n;
