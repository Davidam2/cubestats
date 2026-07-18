import { useEffect, useRef } from "react";
import { eventInfo } from "../domain/events";
import type { EventId } from "../domain/types";

// cubing/twisty is a heavy chunk; import it lazily and only once.
let twistyLoaded: Promise<void> | null = null;
function loadTwisty(): Promise<void> {
  twistyLoaded ??= import("cubing/twisty").then(() => undefined);
  return twistyLoaded;
}

interface TwistyPreviewProps {
  eventId: EventId;
  scramble: string;
  className?: string;
}

/** 2D puzzle preview of a scramble via cubing.js <twisty-player>. */
export function TwistyPreview({ eventId, scramble, className }: TwistyPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    const info = eventInfo(eventId);
    void loadTwisty().then(() => {
      if (cancelled || !containerRef.current) return;
      let player = playerRef.current;
      if (!player) {
        player = document.createElement("twisty-player");
        player.background = "none";
        player.controlPanel = "none";
        player.hintFacelets = "none";
        player.style.width = "100%";
        player.style.height = "100%";
        containerRef.current.appendChild(player);
        playerRef.current = player;
      }
      player.puzzle = info.twistyPuzzle;
      player.visualization = info.preview2D ? "2D" : "auto";
      player.experimentalSetupAlg = scramble;
      player.alg = "";
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, scramble]);

  return <div ref={containerRef} className={className} aria-hidden="true" />;
}
