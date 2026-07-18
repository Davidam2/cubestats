import { create } from "zustand";

export type View = "timer" | "stats" | "sessions" | "settings";

interface UiStore {
  view: View;
  zenMode: boolean;
  /** When false, global timer key handling is suppressed (typing in inputs/modals). */
  timerInputEnabled: boolean;
  setView: (view: View) => void;
  toggleZen: () => void;
  setZen: (zen: boolean) => void;
  setTimerInputEnabled: (enabled: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  view: "timer",
  zenMode: false,
  timerInputEnabled: true,
  setView: (view) => set({ view }),
  toggleZen: () => set((s) => ({ zenMode: !s.zenMode })),
  setZen: (zenMode) => set({ zenMode }),
  setTimerInputEnabled: (timerInputEnabled) => set({ timerInputEnabled }),
}));
