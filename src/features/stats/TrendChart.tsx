import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { TrendData } from "../../domain/stats/series";
import { formatMs } from "../../domain/time/format";
import { useI18n } from "../../i18n/useI18n";
import { useSettingsStore } from "../../state/settingsStore";

const CHART_HEIGHT = 260;

/** Canvas can't resolve CSS variables, so token colors are read at build time. */
function cssVar(styles: CSSStyleDeclaration, name: string): string {
  return styles.getPropertyValue(name).trim();
}

function toPlot(values: Float64Array): (number | null)[] {
  return Array.from(values, (v) => (Number.isNaN(v) ? null : v));
}

interface TrendChartProps {
  data: TrendData;
}

/** Single/ao5/ao12 progression over solve number (uPlot, crosshair + live legend). */
export function TrendChart({ data }: TrendChartProps) {
  const { t } = useI18n();
  const theme = useSettingsStore((s) => s.settings.theme);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const styles = getComputedStyle(document.documentElement);
    const axis: uPlot.Axis = {
      stroke: cssVar(styles, "--muted"),
      ticks: { stroke: cssVar(styles, "--border"), width: 1 },
      grid: { stroke: cssVar(styles, "--border"), width: 1 },
    };

    const chart = new uPlot(
      {
        width: el.clientWidth,
        height: CHART_HEIGHT,
        cursor: { drag: { x: false, y: false } },
        scales: { x: { time: false } },
        series: [
          {},
          {
            label: t("stat.single"),
            stroke: cssVar(styles, "--chart-single"),
            width: 1,
            points: { show: false },
          },
          {
            label: "ao5",
            stroke: cssVar(styles, "--chart-ao5"),
            width: 2,
            points: { show: false },
          },
          {
            label: "ao12",
            stroke: cssVar(styles, "--chart-ao12"),
            width: 2,
            points: { show: false },
          },
        ],
        axes: [
          axis,
          {
            ...axis,
            size: 64,
            values: (_u, splits) => splits.map((v) => formatMs(v)),
          },
        ],
      },
      [Array.from(data.x), toPlot(data.single), toPlot(data.ao5), toPlot(data.ao12)],
      el,
    );

    const ro = new ResizeObserver(() => {
      chart.setSize({ width: el.clientWidth, height: CHART_HEIGHT });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.destroy();
    };
    // Rebuild on theme switch: stroke colors are resolved token values.
  }, [data, theme, t]);

  return <div ref={ref} className="w-full" />;
}
