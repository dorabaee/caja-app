import type { Settings } from "@core/model/types";

/** Reflect theme/accent/locale onto <html> so CSS variables + lang update. */
export function applyTheme(s: Pick<Settings, "theme" | "accent" | "locale">): void {
  const html = document.documentElement;
  html.dataset.theme = s.theme;
  html.dataset.accent = s.accent;
  html.lang = s.locale;
}
