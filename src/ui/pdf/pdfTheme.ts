import type { AccentName } from "@core/model/types";

/**
 * Static palette for the printed PDF. @react-pdf has no CSS variables, so the
 * tokens from theme/tokens.css are mirrored here as literals. The statement is
 * always a light document (paper is white) regardless of the app theme; only the
 * accent follows the user's choice, using the text-safe `--accent-strong` shade.
 */
export const PDF_INK = "#16181d";
export const PDF_INK_SOFT = "#1f232b";
export const PDF_MUTED = "#5b6270";
export const PDF_SUBTLE = "#8a909c";
export const PDF_BORDER = "#e6e8eb";
export const PDF_BORDER_STRONG = "#d4d8dd";
export const PDF_SURFACE_2 = "#f1f3f5";
export const PDF_NEGATIVE = "#b42318";

/** `--accent-strong` per accent (white-text-safe, ≥4.5:1). */
const ACCENT_STRONG: Record<AccentName, string> = {
  emerald: "#047857",
  ocean: "#0369a1",
  grape: "#6d28d9",
  sunset: "#c2410c",
  cherry: "#be185d",
  graphite: "#3f4858",
};

export function pdfAccent(accent: AccentName): string {
  return ACCENT_STRONG[accent] ?? ACCENT_STRONG.emerald;
}

/** Net-result color: accent when in the black, red when in the red. */
export function netColor(value: number, accent: AccentName): string {
  return value < 0 ? PDF_NEGATIVE : pdfAccent(accent);
}
