/** Full Spanish month names, indexed 0–11. (en/i18n handled in a later milestone.) */
export const MONTHS_FULL_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

/** Three-letter Spanish month labels for chart axes, indexed 0–11. */
export const MONTHS_SHORT_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

/** Full English month names, indexed 0–11. */
export const MONTHS_FULL_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Three-letter English month labels for chart axes, indexed 0–11. */
export const MONTHS_SHORT_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

type Loc = "es" | "en";

/** Full month names for the given locale. */
export function monthsFull(locale: Loc): readonly string[] {
  return locale === "en" ? MONTHS_FULL_EN : MONTHS_FULL_ES;
}

/** Short (3-letter) month labels for the given locale. */
export function monthsShort(locale: Loc): readonly string[] {
  return locale === "en" ? MONTHS_SHORT_EN : MONTHS_SHORT_ES;
}
