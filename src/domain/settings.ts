import type { EventId } from "./types";

export type Locale = "es" | "en";
export type Theme = "dark" | "light";

export type RaceTargetSource = "pb-single" | "pb-ao5" | "goal" | "custom";

export interface Settings {
  locale: Locale;
  theme: Theme;
  inspectionEnabled: boolean;
  inspectionVoiceAlerts: boolean;
  holdThresholdMs: number;
  hideTimeWhileRunning: boolean;
  manualEntryMode: boolean;
  activeEventId: EventId;
  activeSessionId: string | null;
  streakMinSolves: number;
  raceModeEnabled: boolean;
  raceTargetSource: RaceTargetSource;
  raceCustomTargetMs: number;
}

export const defaultSettings: Settings = {
  locale: "es",
  theme: "dark",
  inspectionEnabled: false,
  inspectionVoiceAlerts: true,
  holdThresholdMs: 300,
  hideTimeWhileRunning: false,
  manualEntryMode: false,
  activeEventId: "333",
  activeSessionId: null,
  streakMinSolves: 1,
  raceModeEnabled: false,
  raceTargetSource: "pb-single",
  raceCustomTargetMs: 20000,
};
