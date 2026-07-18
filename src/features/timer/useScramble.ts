import { useCallback, useEffect, useState } from "react";
import type { EventId } from "../../domain/types";
import { nextScramble, warmScramble } from "../../scrambles/scrambleService";

interface UseScrambleResult {
  scramble: string | null;
  error: boolean;
  /** Advance to a freshly generated scramble. */
  next: () => void;
}

/** Manages the current scramble for an event, regenerating on demand. */
export function useScramble(eventId: EventId): UseScrambleResult {
  const [scramble, setScramble] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback((event: EventId) => {
    setScramble(null);
    setError(false);
    let cancelled = false;
    nextScramble(event)
      .then((s) => {
        if (!cancelled) setScramble(s);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    warmScramble(eventId);
    return load(eventId);
  }, [eventId, load]);

  const next = useCallback(() => {
    load(eventId);
  }, [eventId, load]);

  return { scramble, error, next };
}
