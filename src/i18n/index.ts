import type { Locale } from "../domain/settings";
import { en } from "./en";
import { es, type Messages } from "./es";

const DICTIONARIES: Record<Locale, Messages> = { es, en };

export function detectLocale(): Locale {
  const lang = typeof navigator !== "undefined" ? navigator.language : "es";
  return lang.toLowerCase().startsWith("en") ? "en" : "es";
}

export function getDictionary(locale: Locale): Messages {
  return DICTIONARIES[locale];
}

export type { Messages, MessageKey } from "./es";
