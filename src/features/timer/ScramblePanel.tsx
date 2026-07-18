import { Suspense, lazy } from "react";
import type { EventId } from "../../domain/types";
import { useI18n } from "../../i18n/useI18n";

const TwistyPreview = lazy(() =>
  import("../../scrambles/TwistyPreview").then((m) => ({ default: m.TwistyPreview })),
);

interface ScramblePanelProps {
  eventId: EventId;
  scramble: string | null;
  error: boolean;
  onNew: () => void;
}

/** Shows the current scramble text and a 2D preview of the puzzle. */
export function ScramblePanel({ eventId, scramble, error, onNew }: ScramblePanelProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onNew}
        className="max-w-3xl select-text text-center font-mono text-lg leading-relaxed text-[var(--fg)] sm:text-xl"
        title={t("timer.newScramble")}
      >
        {error ? t("timer.scrambleError") : (scramble ?? t("timer.noScramble"))}
      </button>
      {scramble && !error && (
        <Suspense fallback={<div className="h-32 w-32" />}>
          <TwistyPreview eventId={eventId} scramble={scramble} className="h-32 w-40" />
        </Suspense>
      )}
    </div>
  );
}
