import { randomScrambleForEvent } from "cubing/scramble";
import { setSearchDebug } from "cubing/search";
import { eventInfo } from "../domain/events";
import type { EventId } from "../domain/types";

// cubing.js instantiates its scramble worker via one of three strategies. Under
// a Vite/esbuild production bundle the default order picks a worker build that
// crashes ("document is not defined"); prioritizing the esbuild workaround makes
// it use the bundler-friendly worker URL. No effect in dev (workers load fine).
setSearchDebug({
  prioritizeEsbuildWorkaroundForWorkerInstantiation: true,
  showWorkerInstantiationWarnings: false,
});

/**
 * Thin wrapper over cubing.js scramble generation with per-event prefetch:
 * while the cuber solves, the next scramble is already being computed.
 * cubing.js runs generation in a Web Worker, so the UI never blocks.
 */

const prefetchQueue = new Map<EventId, Promise<string>>();

async function generate(eventId: EventId): Promise<string> {
  const info = eventInfo(eventId);
  const alg = await randomScrambleForEvent(info.scrambleEvent);
  return alg.toString();
}

function prefetch(eventId: EventId): void {
  if (!prefetchQueue.has(eventId)) {
    prefetchQueue.set(
      eventId,
      generate(eventId).catch((err) => {
        prefetchQueue.delete(eventId);
        throw err;
      }),
    );
  }
}

/** Next scramble for the event: the prefetched one if ready, then queue another. */
export async function nextScramble(eventId: EventId): Promise<string> {
  const pending = prefetchQueue.get(eventId);
  const promise = pending ?? generate(eventId);
  prefetchQueue.delete(eventId);
  try {
    const scramble = await promise;
    prefetch(eventId); // warm the next one
    return scramble;
  } catch (err) {
    prefetch(eventId);
    throw err;
  }
}

/** Warm the queue for an event (e.g. when it becomes active). */
export function warmScramble(eventId: EventId): void {
  prefetch(eventId);
}
