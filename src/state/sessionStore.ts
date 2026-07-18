import { create } from "zustand";
import type { EventId } from "../domain/types";
import { sessionRepo } from "../db/repo/sessionRepo";
import { settingsRepo } from "../db/repo/settingsRepo";
import { useSettingsStore } from "./settingsStore";

interface SessionStore {
  activeEventId: EventId;
  activeSessionId: string | null;
  ready: boolean;
  /** Resolve the active event/session from settings, seeding a default session. */
  hydrate: (defaultSessionName: string) => Promise<void>;
  selectEvent: (eventId: EventId, defaultSessionName: string) => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
}

export const useSessionStore = create<SessionStore>((set) => ({
  activeEventId: "333",
  activeSessionId: null,
  ready: false,

  async hydrate(defaultSessionName) {
    const settings = useSettingsStore.getState().settings;
    const eventId = settings.activeEventId;
    let sessionId = settings.activeSessionId;
    if (sessionId) {
      const existing = await sessionRepo.get(sessionId);
      if (!existing || existing.eventId !== eventId) sessionId = null;
    }
    if (!sessionId) {
      const session = await sessionRepo.ensureForEvent(eventId, defaultSessionName);
      sessionId = session.id;
      await settingsRepo.setMany({ activeSessionId: sessionId });
    }
    set({ activeEventId: eventId, activeSessionId: sessionId, ready: true });
  },

  async selectEvent(eventId, defaultSessionName) {
    const session = await sessionRepo.ensureForEvent(eventId, defaultSessionName);
    await settingsRepo.setMany({ activeEventId: eventId, activeSessionId: session.id });
    set({ activeEventId: eventId, activeSessionId: session.id });
  },

  async selectSession(sessionId) {
    await settingsRepo.setMany({ activeSessionId: sessionId });
    set({ activeSessionId: sessionId });
  },
}));
