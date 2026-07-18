import Dexie, { type EntityTable } from "dexie";
import type { Goal, Session, Solve, TrashedSolve } from "../domain/types";

export interface SettingRow {
  key: string;
  value: unknown;
  updatedAt: number;
}

export class CubeStatsDB extends Dexie {
  sessions!: EntityTable<Session, "id">;
  solves!: EntityTable<Solve, "id">;
  trash!: EntityTable<TrashedSolve, "id">;
  settings!: EntityTable<SettingRow, "key">;
  goals!: EntityTable<Goal, "id">;

  constructor(name = "cubestats") {
    super(name);
    // Version blocks are append-only; never edit a shipped one, add version(n+1).
    this.version(1).stores({
      sessions: "id, eventId, updatedAt",
      solves: "id, sessionId, eventId, timestamp, updatedAt, [sessionId+timestamp], [eventId+timestamp]",
      trash: "id, deletedAt",
      settings: "key",
      goals: "id, eventId",
    });
  }
}

export const db = new CubeStatsDB();
