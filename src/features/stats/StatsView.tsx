import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useSessionStore } from "../../state/sessionStore";
import { useSettingsStore } from "../../state/settingsStore";
import { useI18n } from "../../i18n/useI18n";
import { solveRepo } from "../../db/repo/solveRepo";
import { sessionStats } from "../../domain/stats/session";
import { trendData } from "../../domain/stats/series";
import { activityByDay } from "../../domain/stats/heatmap";
import { formatAverageMs, formatMs } from "../../domain/time/format";
import { effectiveTimeMs, type Solve } from "../../domain/types";
import { TrendChart } from "./TrendChart";
import { HistogramChart } from "./HistogramChart";
import { ActivityHeatmap } from "./ActivityHeatmap";

type Scope = "session" | "event";

function fmtSingle(value: number | null): string {
  return value === null ? "—" : formatMs(value);
}
function fmtAvg(value: number | null): string {
  return value === null ? "—" : formatAverageMs(value);
}

const AVERAGE_ROWS = ["mo3", "ao5", "ao12", "ao25", "ao50", "ao100", "ao1000"] as const;

export function StatsView() {
  const { t } = useI18n();
  const eventId = useSessionStore((s) => s.activeEventId);
  const sessionId = useSessionStore((s) => s.activeSessionId);
  const streakMinSolves = useSettingsStore((s) => s.settings.streakMinSolves);
  const [scope, setScope] = useState<Scope>("session");

  const solves = useLiveQuery(
    () => {
      if (scope === "event") return solveRepo.listByEvent(eventId);
      return sessionId ? solveRepo.listBySession(sessionId) : Promise.resolve([]);
    },
    [scope, eventId, sessionId],
    [] as Solve[],
  );

  const stats = useMemo(() => sessionStats(solves), [solves]);
  const trend = useMemo(() => trendData(solves), [solves]);
  const finiteTimes = useMemo(
    () => solves.map(effectiveTimeMs).filter((v) => Number.isFinite(v)),
    [solves],
  );
  const days = useMemo(() => activityByDay(solves), [solves]);

  const summary: { label: string; value: string }[] = [
    { label: t("stat.count"), value: String(stats.count) },
    { label: t("stat.best"), value: fmtSingle(stats.best) },
    { label: t("stat.worst"), value: fmtSingle(stats.worst) },
    { label: t("stat.mean"), value: fmtAvg(stats.mean) },
    { label: t("stat.median"), value: fmtAvg(stats.median) },
    { label: t("stat.deviation"), value: fmtAvg(stats.stdev) },
    { label: t("stat.dnf"), value: String(stats.dnfCount) },
    { label: t("stat.plus2"), value: String(stats.plus2Count) },
    { label: t("stat.totalTime"), value: formatMs(stats.totalTimeMs) },
  ];

  const scopes: { id: Scope; label: string }[] = [
    { id: "session", label: t("stats.scope.session") },
    { id: "event", label: t("stats.scope.event") },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-4">
        <div className="flex gap-1 self-start rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
          {scopes.map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                scope === s.id
                  ? "bg-[var(--surface-hover)] text-[var(--fg)]"
                  : "text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {stats.count === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--muted)]">{t("stats.empty")}</p>
        ) : (
          <>
            <section>
              <SectionTitle>{t("stats.summary")}</SectionTitle>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {summary.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                  >
                    <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                      {item.label}
                    </p>
                    <p className="font-mono text-lg font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle>{t("stats.averages")}</SectionTitle>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                    <th className="py-1.5 font-medium" />
                    <th className="py-1.5 font-medium">{t("stats.colCurrent")}</th>
                    <th className="py-1.5 font-medium">{t("stats.colBest")}</th>
                  </tr>
                </thead>
                <tbody>
                  {AVERAGE_ROWS.map((key) => (
                    <tr key={key} className="border-t border-[var(--border)]">
                      <td className="py-1.5 text-[var(--muted)]">{key}</td>
                      <td className="py-1.5 font-mono font-semibold">
                        {fmtAvg(stats[key].current)}
                      </td>
                      <td className="py-1.5 font-mono font-semibold">{fmtAvg(stats[key].best)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <SectionTitle>{t("stats.trend")}</SectionTitle>
              {solves.length >= 2 ? (
                <TrendChart data={trend} />
              ) : (
                <p className="text-sm text-[var(--muted)]">{t("stats.noChartData")}</p>
              )}
            </section>

            <section>
              <SectionTitle>{t("stats.distribution")}</SectionTitle>
              {finiteTimes.length >= 2 ? (
                <HistogramChart times={finiteTimes} />
              ) : (
                <p className="text-sm text-[var(--muted)]">{t("stats.noChartData")}</p>
              )}
            </section>

            <section>
              <SectionTitle>{t("stats.activity")}</SectionTitle>
              <ActivityHeatmap days={days} minSolves={streakMinSolves} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
      {children}
    </h2>
  );
}
