import { useMemo } from "react";
import {
  currentStreak,
  dayKey,
  longestStreak,
  shiftDay,
  type DayActivity,
} from "../../domain/stats/heatmap";
import { useI18n } from "../../i18n/useI18n";

const WEEKS = 26;
/** Sequential single-hue steps: opacity of --accent by relative day count. */
const LEVELS = [0.3, 0.55, 0.8, 1];

function level(count: number, max: number): number {
  const ratio = count / max;
  if (ratio <= 0.25) return LEVELS[0];
  if (ratio <= 0.5) return LEVELS[1];
  if (ratio <= 0.75) return LEVELS[2];
  return LEVELS[3];
}

/** Monday of the week containing `key`. */
function weekStart(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return shiftDay(key, -dow);
}

interface ActivityHeatmapProps {
  days: Map<string, DayActivity>;
  minSolves: number;
}

/** GitHub-style activity grid over the last 26 weeks, plus streak tiles. */
export function ActivityHeatmap({ days, minSolves }: ActivityHeatmapProps) {
  const { t } = useI18n();
  const today = dayKey(Date.now());

  const keys = useMemo(() => {
    const start = shiftDay(weekStart(today), -(WEEKS - 1) * 7);
    const out: string[] = [];
    for (let key = start; key <= today; key = shiftDay(key, 1)) out.push(key);
    return out;
  }, [today]);

  const maxCount = useMemo(() => {
    let max = 0;
    for (const v of days.values()) if (v.count > max) max = v.count;
    return max;
  }, [days]);

  const streaks = [
    { label: t("stats.streakCurrent"), value: currentStreak(days, today, minSolves) },
    { label: t("stats.streakLongest"), value: longestStreak(days, minSolves) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto pb-1">
        <div
          className="grid w-max gap-[2px]"
          style={{ gridTemplateRows: "repeat(7, 10px)", gridAutoFlow: "column", gridAutoColumns: "10px" }}
        >
          {keys.map((key) => {
            const activity = days.get(key);
            return (
              <div
                key={key}
                title={activity ? `${key} · ${t("sessions.solvesUnit", activity.count)}` : key}
                className="rounded-[2px]"
                style={
                  activity
                    ? { background: "var(--accent)", opacity: level(activity.count, maxCount) }
                    : { background: "var(--surface-hover)" }
                }
              />
            );
          })}
        </div>
      </div>
      <div className="flex gap-2">
        {streaks.map((s) => (
          <div
            key={s.label}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          >
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{s.label}</p>
            <p className="font-mono text-lg font-semibold">{t("stats.days", s.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
