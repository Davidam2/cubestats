import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { EVENTS } from "../../domain/events";
import type { EventId, Session } from "../../domain/types";
import { sessionStats, type SessionStats } from "../../domain/stats/session";
import { formatAverageMs, formatMs } from "../../domain/time/format";
import { sessionRepo } from "../../db/repo/sessionRepo";
import { solveRepo } from "../../db/repo/solveRepo";
import { useSessionStore } from "../../state/sessionStore";
import { useI18n } from "../../i18n/useI18n";

interface SessionRow {
  session: Session;
  stats: SessionStats;
}

export function SessionsView() {
  const { t, locale } = useI18n();
  const activeEventId = useSessionStore((s) => s.activeEventId);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const selectEvent = useSessionStore((s) => s.selectEvent);
  const selectSession = useSessionStore((s) => s.selectSession);
  const defaultName = t("sessions.defaultName");

  // The view browses its own event so other events can be managed without
  // touching the timer; activating a session re-points the timer if needed.
  const [eventId, setEventId] = useState<EventId>(activeEventId);

  const rows = useLiveQuery(
    async () => {
      const sessions = await sessionRepo.listByEvent(eventId);
      return Promise.all(
        sessions.map(async (session): Promise<SessionRow> => {
          const solves = await solveRepo.listBySession(session.id);
          return { session, stats: sessionStats(solves) };
        }),
      );
    },
    [eventId],
    [] as SessionRow[],
  );

  const activate = async (session: Session) => {
    if (session.eventId !== activeEventId) {
      await selectEvent(session.eventId, defaultName);
    }
    await selectSession(session.id);
  };

  const create = async () => {
    const name = window.prompt(t("sessions.namePrompt"), defaultName);
    if (!name) return;
    const session = await sessionRepo.create(eventId, name);
    if (eventId === activeEventId) await selectSession(session.id);
  };

  const rename = async (session: Session) => {
    const name = window.prompt(t("sessions.namePrompt"), session.name);
    if (!name || name === session.name) return;
    await sessionRepo.update(session.id, { name });
  };

  const archive = async (session: Session) => {
    if (!window.confirm(t("sessions.confirmArchive"))) return;
    await sessionRepo.archive(session.id);
    await ensureActiveExists(session);
  };

  const remove = async (session: Session) => {
    if (!window.confirm(t("sessions.confirmDelete"))) return;
    await sessionRepo.remove(session.id);
    await ensureActiveExists(session);
  };

  /** After archiving/deleting the active session, re-point the timer to a valid one. */
  const ensureActiveExists = async (gone: Session) => {
    if (gone.id !== activeSessionId) return;
    await selectEvent(activeEventId, defaultName);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            {t("timer.event")}
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value as EventId)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--fg)]"
            >
              {EVENTS.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => void create()}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--fg)] hover:bg-[var(--surface-hover)]"
          >
            + {t("sessions.new")}
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--muted)]">{t("sessions.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map(({ session, stats }) => {
              const isActive = session.id === activeSessionId;
              return (
                <li
                  key={session.id}
                  className={`rounded-lg border bg-[var(--surface)] px-4 py-3 ${
                    isActive ? "border-[var(--accent)]" : "border-[var(--border)]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{session.name}</span>
                      {isActive && (
                        <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                          {t("sessions.active")}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--muted)]">
                      {new Date(session.createdAt).toLocaleDateString(locale)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                    <span>{t("sessions.solvesUnit", stats.count)}</span>
                    {stats.best !== null && (
                      <span>
                        {t("stat.best")}{" "}
                        <span className="font-mono text-[var(--fg)]">{formatMs(stats.best)}</span>
                      </span>
                    )}
                    {stats.ao5.best !== null && (
                      <span>
                        ao5{" "}
                        <span className="font-mono text-[var(--fg)]">
                          {formatAverageMs(stats.ao5.best)}
                        </span>
                      </span>
                    )}
                    {stats.ao12.best !== null && (
                      <span>
                        ao12{" "}
                        <span className="font-mono text-[var(--fg)]">
                          {formatAverageMs(stats.ao12.best)}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {!isActive && (
                      <ActionButton onClick={() => void activate(session)} accent>
                        {t("sessions.activate")}
                      </ActionButton>
                    )}
                    <ActionButton onClick={() => void rename(session)}>
                      {t("sessions.rename")}
                    </ActionButton>
                    <ActionButton onClick={() => void archive(session)}>
                      {t("sessions.archive")}
                    </ActionButton>
                    <ActionButton onClick={() => void remove(session)} danger>
                      {t("sessions.delete")}
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  accent,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
  danger?: boolean;
}) {
  const color = accent
    ? "text-[var(--accent)] hover:bg-[var(--surface-hover)]"
    : danger
      ? "text-[var(--muted)] hover:bg-red-500/20 hover:text-red-400"
      : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]";
  return (
    <button
      onClick={onClick}
      className={`rounded-md border border-[var(--border)] px-2 py-1 text-xs ${color}`}
    >
      {children}
    </button>
  );
}
