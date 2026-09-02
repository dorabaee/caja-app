import type { CustomBank } from "./types";

/**
 * Banks that ship with a logo. Anything else a user adds is a custom bank (see
 * `Project.banks`) and renders as initials on a neutral chip — the six below are the
 * only ones with artwork until there's feedback asking for more.
 */
export type BuiltInBankKey =
  | "banorte"
  | "santander"
  | "bbva"
  | "mercadopago"
  | "spin"
  | "coppel";

export interface BankMeta {
  key: string;
  label: string;
  /** 2–3 letter mark, used when there's no logo file. */
  short: string;
  /** Chip text + mark colour. */
  color: string;
  /** Chip background (a light tint of `color`). */
  tint: string;
  /** Filename under `public/banks/`, or null for custom banks (no artwork). */
  logo: string | null;
}

export const BANKS: readonly BankMeta[] = [
  { key: "banorte", label: "Banorte", short: "BNT", color: "#EB0029", tint: "#fbe9ec", logo: "banorte.svg" },
  { key: "santander", label: "Santander", short: "SAN", color: "#EC0000", tint: "#fde8e8", logo: "santander.svg" },
  { key: "bbva", label: "BBVA", short: "BBV", color: "#004481", tint: "#e5eef6", logo: "bbva.svg" },
  { key: "mercadopago", label: "Mercado Pago", short: "MP", color: "#009EE3", tint: "#e4f5fd", logo: "mercadopago.svg" },
  { key: "spin", label: "Spin by OXXO", short: "SPN", color: "#5B21B6", tint: "#efe9fb", logo: "spin.svg" },
  { key: "coppel", label: "Coppel", short: "CPL", color: "#002F6C", tint: "#e5eaf2", logo: "coppel.svg" },
] as const;

const BY_KEY = new Map(BANKS.map((b) => [b.key, b]));

/** Initials for a custom bank: first letters of up to three words, else the first two. */
export function bankInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Resolve a table's `bank` — a built-in key or a custom bank's id — into what the tag
 * needs to draw. `custom` comes from the project, so a bank the user invented resolves
 * the same way a shipped one does.
 */
export function bankMeta(key: string | undefined, custom?: CustomBank[]): BankMeta | null {
  if (!key) return null;
  const built = BY_KEY.get(key);
  if (built) return built;
  const own = custom?.find((b) => b.id === key);
  if (!own) return null;
  return {
    key: own.id,
    label: own.name,
    short: bankInitials(own.name),
    // Custom banks borrow the app's neutral ink rather than inventing a brand colour.
    color: "var(--text-muted)",
    tint: "var(--surface-2)",
    logo: null,
  };
}
