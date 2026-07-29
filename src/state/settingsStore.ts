import { create } from "zustand";
import { defaultSettings, type Settings } from "../domain/settings";
import { settingsRepo } from "../db/repo/settingsRepo";
import { detectLocale } from "../i18n";

interface SettingsStore {
  settings: Settings;
  hydrated: boolean;
  /** Load persisted settings once at boot, seeding the locale from the browser. */
  hydrate: () => Promise<void>;
  /** Re-read settings from the database, discarding in-memory state. */
  reload: () => Promise<void>;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  setMany: (patch: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    const stored = await settingsRepo.load();
    // If the locale was never chosen, follow the browser once (without persisting yet).
    const localeWasStored = await settingsRepo.has("locale");
    const settings: Settings = localeWasStored ? stored : { ...stored, locale: detectLocale() };
    set({ settings, hydrated: true });
  },

  /**
   * Unlike `hydrate`, this always hits the database. Needed after a backup
   * import rewrites the settings rows underneath us, so the UI reflects the
   * restored theme/locale without a reload.
   */
  async reload() {
    set({ settings: await settingsRepo.load(), hydrated: true });
  },

  async set(key, value) {
    set((state) => ({ settings: { ...state.settings, [key]: value } }));
    await settingsRepo.set(key, value);
  },

  async setMany(patch) {
    set((state) => ({ settings: { ...state.settings, ...patch } }));
    await settingsRepo.setMany(patch);
  },
}));
