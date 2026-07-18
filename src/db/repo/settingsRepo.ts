import type { CubeStatsDB } from "../database";
import { db as defaultDb } from "../database";
import { defaultSettings, type Settings } from "../../domain/settings";

export function createSettingsRepo(db: CubeStatsDB = defaultDb) {
  return {
    /** Full settings object, per-key rows layered over defaults. */
    async load(): Promise<Settings> {
      const rows = await db.settings.toArray();
      const result = { ...defaultSettings } as Record<string, unknown>;
      for (const row of rows) {
        if (row.key in defaultSettings) result[row.key] = row.value;
      }
      return result as unknown as Settings;
    },

    async set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
      await db.settings.put({ key: key as string, value, updatedAt: Date.now() });
    },

    async setMany(patch: Partial<Settings>): Promise<void> {
      const now = Date.now();
      const rows = Object.entries(patch).map(([key, value]) => ({ key, value, updatedAt: now }));
      await db.settings.bulkPut(rows);
    },

    /** Whether a settings key has ever been persisted (vs. resolving to its default). */
    async has(key: keyof Settings): Promise<boolean> {
      return (await db.settings.get(key as string)) !== undefined;
    },
  };
}

export const settingsRepo = createSettingsRepo();
