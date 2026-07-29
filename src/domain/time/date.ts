const LOCALE_TAG = { es: "es-ES", en: "en-GB" } as const;

export type Locale = keyof typeof LOCALE_TAG;

/** Absolute date + time of a solve, e.g. "19 jul 2026, 18:42". */
export function formatDateTime(ms: number, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

/** Date only, for grouping headers and average ranges. */
export function formatDate(ms: number, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(ms));
}

/** Range covered by an average: a single date when start and end share the day. */
export function formatDateRange(startMs: number, endMs: number, locale: Locale): string {
  const start = formatDate(startMs, locale);
  const end = formatDate(endMs, locale);
  return start === end ? start : `${start} – ${end}`;
}
