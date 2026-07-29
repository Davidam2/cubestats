import { useEffect, useState } from "react";
import { useSettingsStore } from "./state/settingsStore";
import { useSessionStore } from "./state/sessionStore";
import { useUiStore } from "./state/uiStore";
import { getDictionary } from "./i18n";
import { requestPersistentStorage } from "./db/persist";
import { TabBar } from "./components/TabBar";
import { UpdateBanner } from "./components/UpdateBanner";
import { TimerView } from "./features/timer/TimerView";
import { StatsView } from "./features/stats/StatsView";
import { SessionsView } from "./features/sessions/SessionsView";
import { SettingsView } from "./features/settings/SettingsView";

export function App() {
  const [booted, setBooted] = useState(false);
  const settings = useSettingsStore((s) => s.settings);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateSession = useSessionStore((s) => s.hydrate);
  const sessionReady = useSessionStore((s) => s.ready);
  const view = useUiStore((s) => s.view);

  useEffect(() => {
    // Not awaited: a best-effort storage upgrade must never delay or break boot.
    void requestPersistentStorage();
    (async () => {
      await hydrateSettings();
      await hydrateSession(getDictionary(useSettingsStore.getState().settings.locale)["sessions.defaultName"]);
      setBooted(true);
    })();
  }, [hydrateSettings, hydrateSession]);

  // Apply the theme to the document root.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  if (!booted || !sessionReady) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--muted)]">CubeStats…</div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg)]">
      <TabBar />
      <main className="flex-1 overflow-hidden">
        {view === "timer" && <TimerView />}
        {view === "stats" && <StatsView />}
        {view === "sessions" && <SessionsView />}
        {view === "settings" && <SettingsView />}
      </main>
      <UpdateBanner />
    </div>
  );
}
