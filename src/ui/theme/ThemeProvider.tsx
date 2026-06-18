import { useEffect, type ReactNode } from "react";
import { useStore } from "@core/store";
import { setLocale } from "@core/i18n/config";
import { applyTheme } from "./applyTheme";

/** Reflects settings (theme / accent / locale) onto <html> and re-applies on change. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useStore((s) => s.doc.settings.theme);
  const accent = useStore((s) => s.doc.settings.accent);
  const locale = useStore((s) => s.doc.settings.locale);

  useEffect(() => {
    applyTheme({ theme, accent, locale });
    setLocale(locale);
  }, [theme, accent, locale]);

  return <>{children}</>;
}
