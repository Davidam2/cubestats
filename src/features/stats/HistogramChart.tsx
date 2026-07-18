import { useMemo, useState } from "react";
import { histogram } from "../../domain/stats/histogram";
import { formatMs } from "../../domain/time/format";

const W = 640;
const H = 200;
const PAD_TOP = 8;
const PAD_BOTTOM = 22;

interface HistogramChartProps {
  /** Finite effective times in ms. */
  times: number[];
}

/** Distribution of solve times; hover highlights a bin and shows its range. */
export function HistogramChart({ times }: HistogramChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const bins = useMemo(() => histogram(times), [times]);

  if (bins.length === 0) return null;

  const maxCount = Math.max(...bins.map((b) => b.count));
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const binW = W / bins.length;
  const hovered = hover === null ? null : bins[hover];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        onMouseLeave={() => setHover(null)}
      >
        {bins.map((bin, i) => {
          const h = (bin.count / maxCount) * plotH;
          return (
            <rect
              key={bin.fromMs}
              x={i * binW + 1}
              width={Math.max(1, binW - 2)}
              y={PAD_TOP + plotH - h}
              height={h}
              fill="var(--chart-fill)"
              opacity={hover === null || hover === i ? 1 : 0.4}
              onMouseEnter={() => setHover(i)}
            >
              <title>{`${formatMs(bin.fromMs)}–${formatMs(bin.toMs)} · ${bin.count}`}</title>
            </rect>
          );
        })}
        <line
          x1={0}
          x2={W}
          y1={PAD_TOP + plotH}
          y2={PAD_TOP + plotH}
          stroke="var(--border)"
        />
        <text x={2} y={H - 6} fontSize={11} fill="var(--muted)">
          {formatMs(bins[0].fromMs)}
        </text>
        <text x={W - 2} y={H - 6} fontSize={11} fill="var(--muted)" textAnchor="end">
          {formatMs(bins[bins.length - 1].toMs)}
        </text>
      </svg>
      <p className="h-5 text-center text-xs text-[var(--muted)]">
        {hovered ? `${formatMs(hovered.fromMs)}–${formatMs(hovered.toMs)} · ${hovered.count}` : ""}
      </p>
    </div>
  );
}
