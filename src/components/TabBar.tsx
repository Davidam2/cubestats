import { useUiStore, type View } from "../state/uiStore";
import { useI18n } from "../i18n/useI18n";

const TABS: { view: View; labelKey: Parameters<ReturnType<typeof useI18n>["t"]>[0] }[] = [
  { view: "timer", labelKey: "nav.timer" },
  { view: "stats", labelKey: "nav.stats" },
  { view: "sessions", labelKey: "nav.sessions" },
  { view: "settings", labelKey: "nav.settings" },
];

/** Top-level navigation. No router: a single enum in uiStore drives the view. */
export function TabBar() {
  const { t } = useI18n();
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);

  return (
    <nav className="flex items-center gap-1 border-b border-[var(--border)] bg-[var(--surface)] px-2">
      <span className="mr-3 px-2 py-3 font-bold tracking-tight text-[var(--accent)]">
        {t("app.title")}
      </span>
      {TABS.map((tab) => (
        <button
          key={tab.view}
          onClick={() => setView(tab.view)}
          className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            view === tab.view
              ? "border-[var(--accent)] text-[var(--fg)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--fg)]"
          }`}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </nav>
  );
}
