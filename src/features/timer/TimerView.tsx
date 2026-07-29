import { useCallback, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useSessionStore } from "../../state/sessionStore";
import { useSettingsStore } from "../../state/settingsStore";
import { useUiStore } from "../../state/uiStore";
import { useI18n } from "../../i18n/useI18n";
import { solveRepo } from "../../db/repo/solveRepo";
import { db } from "../../db/database";
import { sessionStats } from "../../domain/stats/session";
import type { Penalty, Solve } from "../../domain/types";
import type { PendingPenalty } from "../../domain/timer/machine";
import { useTimer, type SolveResult } from "./useTimer";
import { useScramble } from "./useScramble";
import { TimerDisplay } from "./TimerDisplay";
import { ScramblePanel } from "./ScramblePanel";
import { SolveStatsBar } from "./SolveStatsBar";
import { RecentSolves } from "./RecentSolves";
import { EventSessionPicker } from "./EventSessionPicker";
import { SolveDetailModal } from "./SolveDetailModal";

function pendingToPenalty(pending: PendingPenalty): Penalty {
  return pending === "none" ? "OK" : pending;
}

const RECENT_LIMIT = 50;

export function TimerView() {
  const { t } = useI18n();
  const eventId = useSessionStore((s) => s.activeEventId);
  const sessionId = useSessionStore((s) => s.activeSessionId);
  const settings = useSettingsStore((s) => s.settings);
  const timerInputEnabled = useUiStore((s) => s.timerInputEnabled);
  const zenMode = useUiStore((s) => s.zenMode);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { scramble, error, next: nextScramble } = useScramble(eventId);

  const sessionSolves = useLiveQuery(
    () => (sessionId ? solveRepo.listBySession(sessionId) : Promise.resolve([])),
    [sessionId],
    [] as Solve[],
  );
  // Re-run the query whenever solves change.
  useLiveQuery(() => db.solves.count(), []);

  const stats = useMemo(() => sessionStats(sessionSolves), [sessionSolves]);
  const recent = useMemo(
    () => [...sessionSolves].reverse().slice(0, RECENT_LIMIT),
    [sessionSolves],
  );

  const selectedIndex = useMemo(
    () => (selectedId ? sessionSolves.findIndex((s) => s.id === selectedId) : -1),
    [selectedId, sessionSolves],
  );

  const onSolve = useCallback(
    (result: SolveResult) => {
      if (!sessionId) return;
      void solveRepo
        .add({
          sessionId,
          eventId,
          timeMs: Math.round(result.elapsedMs),
          penalty: pendingToPenalty(result.pending),
          scramble: scramble ?? "",
        })
        .then(() => nextScramble());
    },
    [sessionId, eventId, scramble, nextScramble],
  );

  const timerConfig = useMemo(
    () => ({
      inspectionEnabled: settings.inspectionEnabled,
      holdThresholdMs: settings.holdThresholdMs,
    }),
    [settings.inspectionEnabled, settings.holdThresholdMs],
  );

  const { state, getElapsedMs, getInspectionElapsedMs, surfaceHandlers } = useTimer({
    config: timerConfig,
    onSolve,
    enabled: timerInputEnabled,
  });

  const solving =
    state.kind !== "idle" && state.kind !== "stopped" && state.kind !== "readyToInspect";

  return (
    <div className="flex h-full flex-col">
      {!zenMode && (
        <div className="border-b border-[var(--border)] px-4 py-3">
          <EventSessionPicker />
        </div>
      )}

      <div
        {...surfaceHandlers}
        className="relative flex flex-1 touch-none select-none flex-col items-center justify-center gap-8 px-4"
        style={{ touchAction: "none" }}
      >
        {!solving && !zenMode && (
          <ScramblePanel eventId={eventId} scramble={scramble} error={error} onNew={nextScramble} />
        )}

        <TimerDisplay
          state={state}
          getElapsedMs={getElapsedMs}
          getInspectionElapsedMs={getInspectionElapsedMs}
          hideWhileRunning={settings.hideTimeWhileRunning}
        />

        {!solving && <SolveStatsBar stats={stats} />}

        {state.kind === "idle" && stats.count === 0 && (
          <p className="text-sm text-[var(--muted)]">{t("timer.pressForScramble")}</p>
        )}
      </div>

      {!zenMode && (
        <div className="max-h-64 overflow-y-auto border-t border-[var(--border)] px-4 py-2">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("list.recentSolves")}
          </h2>
          <RecentSolves
            solves={recent}
            totalCount={sessionSolves.length}
            onDeleted={() => {}}
            onSelect={(solve) => setSelectedId(solve.id)}
          />
        </div>
      )}

      {selectedIndex >= 0 && (
        <SolveDetailModal
          solve={sessionSolves[selectedIndex]}
          number={selectedIndex + 1}
          onClose={() => setSelectedId(null)}
          onDeleted={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
