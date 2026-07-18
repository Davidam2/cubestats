export type Penalty = "OK" | "+2" | "DNF";

export type EventId =
  | "222"
  | "333"
  | "444"
  | "555"
  | "666"
  | "777"
  | "333oh"
  | "333bf"
  | "333fm"
  | "clock"
  | "minx"
  | "pyram"
  | "skewb"
  | "sq1"
  | "444bf"
  | "555bf";

export interface Solve {
  id: string;
  sessionId: string;
  /** Denormalized from the session so global per-event queries hit an index. */
  eventId: EventId;
  /** Raw measured milliseconds; penalties never mutate this. */
  timeMs: number;
  penalty: Penalty;
  scramble: string;
  comment?: string;
  /** Epoch ms of solve completion. */
  timestamp: number;
  createdAt: number;
  updatedAt: number;
}

export interface Session {
  id: string;
  eventId: EventId;
  name: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
}

export type GoalKind = "single" | "ao5" | "ao12" | "ao100";

export interface Goal {
  id: string;
  eventId: EventId;
  kind: GoalKind;
  targetMs: number;
  createdAt: number;
  updatedAt: number;
  achievedAt?: number;
}

export interface TrashedSolve extends Solve {
  deletedAt: number;
}

/** Effective result in ms: +2 adds 2000, DNF becomes Infinity so it sorts worst. */
export function effectiveTimeMs(solve: Pick<Solve, "timeMs" | "penalty">): number {
  if (solve.penalty === "DNF") return Infinity;
  return solve.penalty === "+2" ? solve.timeMs + 2000 : solve.timeMs;
}
