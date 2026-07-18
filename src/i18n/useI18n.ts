import { useMemo } from "react";
import { useSettingsStore } from "../state/settingsStore";
import { getDictionary, type Messages } from "./index";

type Args<T> = T extends (...args: infer A) => string ? A : [];

export interface I18n {
  locale: "es" | "en";
  t: <K extends keyof Messages>(key: K, ...args: Args<Messages[K]>) => string;
}

/** Direct-access translator: t("stat.best") or t("list.solveNumber", 12). */
export function useI18n(): I18n {
  const locale = useSettingsStore((s) => s.settings.locale);
  return useMemo(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      t: (key, ...args) => {
        const entry = dict[key];
        return typeof entry === "function" ? (entry as (...a: unknown[]) => string)(...args) : (entry as string);
      },
    };
  }, [locale]);
}
