import { useRegisterSW } from "virtual:pwa-register/react";
import { useI18n } from "../i18n/useI18n";

/**
 * Registers the service worker and offers the update on the user's terms.
 *
 * The plugin is configured with `registerType: "prompt"` precisely so this stays
 * a choice: an automatic reload that lands mid-solve destroys the attempt, and a
 * timer that can eat your time is worse than a timer that is one version behind.
 * Dismissing is safe — the new worker stays waiting and installs on a later visit.
 */
export function UpdateBanner() {
  const { t } = useI18n();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm shadow-xl">
        <span>{t("update.available")}</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setNeedRefresh(false)}
            className="rounded-md px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
          >
            {t("update.dismiss")}
          </button>
          <button
            onClick={() => void updateServiceWorker(true)}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 font-medium text-white hover:opacity-90"
          >
            {t("update.action")}
          </button>
        </div>
      </div>
    </div>
  );
}
