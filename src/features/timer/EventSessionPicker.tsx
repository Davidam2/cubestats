import { useLiveQuery } from "dexie-react-hooks";
import { EVENTS } from "../../domain/events";
import type { EventId } from "../../domain/types";
import { db } from "../../db/database";
import { sessionRepo } from "../../db/repo/sessionRepo";
import { useSessionStore } from "../../state/sessionStore";
import { useI18n } from "../../i18n/useI18n";

/** Event + session selectors that drive the active timer context. */
export function EventSessionPicker() {
  const { t } = useI18n();
  const activeEventId = useSessionStore((s) => s.activeEventId);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const selectEvent = useSessionStore((s) => s.selectEvent);
  const selectSession = useSessionStore((s) => s.selectSession);
  const defaultName = t("sessions.defaultName");

  const sessions = useLiveQuery(
    () => sessionRepo.listByEvent(activeEventId),
    [activeEventId],
    [],
  );
  // Touch db.sessions so the query re-runs on any session change.
  useLiveQuery(() => db.sessions.count(), []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        {t("timer.event")}
        <select
          value={activeEventId}
          onChange={(e) => void selectEvent(e.target.value as EventId, defaultName)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--fg)]"
        >
          {EVENTS.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        {t("timer.session")}
        <select
          value={activeSessionId ?? ""}
          onChange={(e) => void selectSession(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--fg)]"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <button
        onClick={async () => {
          const name = window.prompt(t("sessions.namePrompt"), defaultName);
          if (!name) return;
          const session = await sessionRepo.create(activeEventId, name);
          void selectSession(session.id);
        }}
        className="rounded-md border border-[var(--border)] px-2 py-1 text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)]"
      >
        + {t("sessions.new")}
      </button>
    </div>
  );
}
