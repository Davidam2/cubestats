import { Suspense, lazy, useState } from "react";
import { Modal } from "../../components/Modal";
import { useI18n } from "../../i18n/useI18n";
import { formatSolveResult } from "../../domain/time/format";
import { formatDateTime } from "../../domain/time/date";
import { solveRepo } from "../../db/repo/solveRepo";
import type { Penalty, Solve } from "../../domain/types";

const TwistyPreview = lazy(() =>
  import("../../scrambles/TwistyPreview").then((m) => ({ default: m.TwistyPreview })),
);

interface SolveDetailModalProps {
  solve: Solve;
  /** 1-based position in the session, matching the solve list. */
  number: number;
  onClose: () => void;
  onDeleted?: (solve: Solve) => void;
}

const PENALTIES: Penalty[] = ["OK", "+2", "DNF"];

/** Full metadata of a solve: result, penalty, date, scramble and comment. */
export function SolveDetailModal({ solve, number, onClose, onDeleted }: SolveDetailModalProps) {
  const { t, locale } = useI18n();
  const [comment, setComment] = useState(solve.comment ?? "");
  const [copied, setCopied] = useState(false);

  const saveComment = () => {
    const next = comment.trim();
    if (next === (solve.comment ?? "")) return;
    void solveRepo.update(solve.id, { comment: next || undefined });
  };

  const copyScramble = async () => {
    await navigator.clipboard.writeText(solve.scramble);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal title={t("solve.detail")} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            {t("list.solveNumber", number)}
          </p>
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {formatSolveResult(solve)}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {formatDateTime(solve.timestamp, locale)}
          </p>
        </div>

        <div className="flex gap-1">
          {PENALTIES.map((p) => (
            <button
              key={p}
              onClick={() => void solveRepo.setPenalty(solve.id, p)}
              className={`rounded px-3 py-1 text-xs font-medium ${
                solve.penalty === p
                  ? "bg-[var(--surface-hover)] text-[var(--fg)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {solve.scramble && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                {t("solve.scramble")}
              </span>
              <button
                onClick={() => void copyScramble()}
                className="rounded px-2 py-0.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
              >
                {copied ? "✓" : t("solve.copyScramble")}
              </button>
            </div>
            <p className="select-text break-words font-mono text-sm">{solve.scramble}</p>
            <Suspense fallback={<div className="h-28" />}>
              <TwistyPreview
                eventId={solve.eventId}
                scramble={solve.scramble}
                className="mx-auto mt-2 h-28 w-36"
              />
            </Suspense>
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
            {t("solve.comment")}
          </span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={saveComment}
            rows={2}
            className="resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
          />
        </label>

        {onDeleted && (
          <button
            onClick={async () => {
              saveComment();
              await solveRepo.remove(solve.id);
              onDeleted(solve);
              onClose();
            }}
            className="self-start rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-red-500/20 hover:text-red-400"
          >
            {t("solve.delete")}
          </button>
        )}
      </div>
    </Modal>
  );
}
