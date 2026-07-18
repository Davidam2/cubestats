import type { Solve } from "../types";

export interface DayActivity {
  count: number;
  timeMs: number;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Local-date key YYYY-MM-DD for a timestamp. */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Shifts a YYYY-MM-DD key by whole days (noon anchor dodges DST edges). */
export function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  date.setDate(date.getDate() + delta);
  return dayKey(date.getTime());
}

type HeatmapSolve = Pick<Solve, "timestamp" | "timeMs">;

export function activityByDay(solves: readonly HeatmapSolve[]): Map<string, DayActivity> {
  const map = new Map<string, DayActivity>();
  for (const s of solves) {
    const key = dayKey(s.timestamp);
    const cur = map.get(key);
    if (cur) {
      cur.count++;
      cur.timeMs += s.timeMs;
    } else {
      map.set(key, { count: 1, timeMs: s.timeMs });
    }
  }
  return map;
}

/** Consecutive qualifying days ending today — or yesterday, so an unplayed today doesn't kill a live streak. */
export function currentStreak(
  days: ReadonlyMap<string, DayActivity>,
  today: string,
  minSolves = 1,
): number {
  const qualifies = (key: string) => (days.get(key)?.count ?? 0) >= minSolves;
  let cursor = qualifies(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (qualifies(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

export function longestStreak(days: ReadonlyMap<string, DayActivity>, minSolves = 1): number {
  const keys = [...days.entries()]
    .filter(([, v]) => v.count >= minSolves)
    .map(([k]) => k)
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of keys) {
    run = prev !== null && shiftDay(prev, 1) === key ? run + 1 : 1;
    if (run > best) best = run;
    prev = key;
  }
  return best;
}
