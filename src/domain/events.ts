import type { EventId } from "./types";

export interface EventInfo {
  id: EventId;
  /** WCA-style display name; not translated (community convention). */
  name: string;
  /** Event id understood by cubing.js `randomScrambleForEvent` (OH reuses 333). */
  scrambleEvent: string;
  /** Puzzle id for cubing.js twisty previews. */
  twistyPuzzle: string;
  /** Whether the flat 2D preview is reliable; otherwise the player picks its default. */
  preview2D: boolean;
  /** Headline average shown for the event (WCA format). */
  defaultFormat: "ao5" | "mo3";
}

export const EVENTS: readonly EventInfo[] = [
  { id: "333", name: "3×3×3", scrambleEvent: "333", twistyPuzzle: "3x3x3", preview2D: true, defaultFormat: "ao5" },
  { id: "222", name: "2×2×2", scrambleEvent: "222", twistyPuzzle: "2x2x2", preview2D: true, defaultFormat: "ao5" },
  { id: "444", name: "4×4×4", scrambleEvent: "444", twistyPuzzle: "4x4x4", preview2D: true, defaultFormat: "ao5" },
  { id: "555", name: "5×5×5", scrambleEvent: "555", twistyPuzzle: "5x5x5", preview2D: true, defaultFormat: "ao5" },
  { id: "666", name: "6×6×6", scrambleEvent: "666", twistyPuzzle: "6x6x6", preview2D: true, defaultFormat: "mo3" },
  { id: "777", name: "7×7×7", scrambleEvent: "777", twistyPuzzle: "7x7x7", preview2D: true, defaultFormat: "mo3" },
  { id: "333oh", name: "3×3×3 OH", scrambleEvent: "333", twistyPuzzle: "3x3x3", preview2D: true, defaultFormat: "ao5" },
  { id: "333bf", name: "3×3×3 BLD", scrambleEvent: "333bf", twistyPuzzle: "3x3x3", preview2D: true, defaultFormat: "mo3" },
  { id: "333fm", name: "3×3×3 FMC", scrambleEvent: "333fm", twistyPuzzle: "3x3x3", preview2D: true, defaultFormat: "mo3" },
  { id: "clock", name: "Clock", scrambleEvent: "clock", twistyPuzzle: "clock", preview2D: false, defaultFormat: "ao5" },
  { id: "minx", name: "Megaminx", scrambleEvent: "minx", twistyPuzzle: "megaminx", preview2D: true, defaultFormat: "ao5" },
  { id: "pyram", name: "Pyraminx", scrambleEvent: "pyram", twistyPuzzle: "pyraminx", preview2D: true, defaultFormat: "ao5" },
  { id: "skewb", name: "Skewb", scrambleEvent: "skewb", twistyPuzzle: "skewb", preview2D: true, defaultFormat: "ao5" },
  { id: "sq1", name: "Square-1", scrambleEvent: "sq1", twistyPuzzle: "square1", preview2D: false, defaultFormat: "ao5" },
  { id: "444bf", name: "4×4×4 BLD", scrambleEvent: "444bf", twistyPuzzle: "4x4x4", preview2D: true, defaultFormat: "mo3" },
  { id: "555bf", name: "5×5×5 BLD", scrambleEvent: "555bf", twistyPuzzle: "5x5x5", preview2D: true, defaultFormat: "mo3" },
];

const byId = new Map<EventId, EventInfo>(EVENTS.map((e) => [e.id, e]));

export function eventInfo(id: EventId): EventInfo {
  const info = byId.get(id);
  if (!info) throw new Error(`Unknown event: ${id}`);
  return info;
}

export function isEventId(value: string): value is EventId {
  return byId.has(value as EventId);
}
