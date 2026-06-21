import { useMemo } from "react";
import { useStore } from "@core/store";
import type { ChartPalette } from "@core/model/types";

/** Curated categorical set for the "colorful" palette (balanced in light + dark). */
const COLORFUL = [
  "#10b981", // emerald
  "#0ea5e9", // sky
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f97316", // orange
];

type Rgb = [number, number, number];

function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function hexToRgb(hex: string): Rgb {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToCss([r, g, b]: Rgb): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export interface ChartColors {
  palette: ChartPalette;
  /** Resolved --accent (single-stroke line/area + uniform mono bars). */
  accent: string;
  /** Resolved --accent-strong (filled marks that may sit under white text). */
  accentStrong: string;
  /** Semantic money colors (Entró green / Salió red) for dashboard charts. */
  income: string;
  expense: string;
  /** Per-bar color: uniform accent in mono, cycled categorical in colorful. */
  barColor(i: number): string;
  /** Distinct colors for the slices of a pie (mono accent ramp / colorful cycle). */
  sliceColors(total: number): string[];
  /** Stable color for a named category (#16): hashed → categorical set (distinct)
   *  or an accent-ramp shade (monochrome). */
  categoryColor(label: string, distinct: boolean): string;
  axis: string;
  grid: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  reduceMotion: boolean;
}

/**
 * Chart colors bound to the current accent / theme / palette. Reads the resolved
 * CSS variables off <html> so light/dark and the 6 accents flow through for free.
 */
export function useChartColors(): ChartColors {
  const accentName = useStore((s) => s.doc.settings.accent);
  const theme = useStore((s) => s.doc.settings.theme);
  const palette = useStore((s) => s.doc.settings.chartPalette);

  return useMemo<ChartColors>(() => {
    const accent = readVar("--accent", "#10b981");
    const strong = readVar("--accent-strong", "#047857");
    const accentRgb = hexToRgb(accent);
    const strongRgb = hexToRgb(strong);
    const lightRgb = mix(accentRgb, [255, 255, 255], 0.32); // light tint that still reads on a white surface

    const monoRamp = (total: number): string[] => {
      if (total <= 1) return [accent];
      return Array.from({ length: total }, (_, i) =>
        rgbToCss(mix(lightRgb, strongRgb, i / (total - 1))),
      );
    };

    const hash = (s: string): number => {
      let h = 0;
      for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return h;
    };

    const reduceMotion =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    return {
      palette,
      accent,
      accentStrong: strong,
      income: readVar("--income", "#15a35b"),
      expense: readVar("--expense", "#e0453b"),
      barColor: (i: number) => (palette === "colorful" ? COLORFUL[i % COLORFUL.length] : accent),
      sliceColors: (total: number) =>
        palette === "colorful"
          ? Array.from({ length: total }, (_, i) => COLORFUL[i % COLORFUL.length])
          : monoRamp(total),
      categoryColor: (label: string, distinct: boolean) => {
        const h = hash(label);
        if (distinct) return COLORFUL[h % COLORFUL.length];
        // monochrome: a stable shade along the accent ramp
        return rgbToCss(mix(lightRgb, strongRgb, (h % 100) / 100));
      },
      axis: readVar("--text-subtle", "#8a909c"),
      grid: readVar("--border", "#e6e8eb"),
      tooltipBg: readVar("--surface", "#ffffff"),
      tooltipBorder: readVar("--border-strong", "#d4d8dd"),
      tooltipText: readVar("--text", "#16181d"),
      reduceMotion,
    };
    // accentName/theme drive the [data-accent]/[data-theme] attrs we read from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accentName, theme, palette]);
}
