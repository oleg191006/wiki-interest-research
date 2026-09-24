import type { Analysis } from "../../application/analysis-model.ts";
import { labelIn } from "../../application/series-label.ts";
import { eachDay } from "../../domain/calendar.ts";
import { sum } from "../../domain/stats.ts";
import type { Translator } from "../i18n/translator.ts";
import { dailyChart, type DailyPanel } from "./daily-chart.ts";
import { growthChart, type GrowthRow } from "./growth-chart.ts";
import { PALETTE } from "./theme.ts";
import { trendChart, type TrendSeries } from "./trend-chart.ts";

export interface ChartInputs {
  trendSeries: TrendSeries[];
  growthRows: GrowthRow[];
  dailyPanels: DailyPanel[];
}

export function chartInputs(a: Analysis, tr: Translator): ChartInputs {
  const w = a.windows;
  const baseIdx = w.baselineMonths.map((m) => w.months.indexOf(m)).filter((i) => i >= 0);
  const index = (vals: number[]) => {
    const base = sum(baseIdx.map((i) => vals[i])) / Math.max(1, baseIdx.length);
    return vals.map((v) => (base > 0 ? (v / base) * 100 : null));
  };
  const colorOf = (id: string) => PALETTE[a.series.findIndex((s) => s.id === id) % PALETTE.length];
  const shown = [...a.series].sort((x, y) => y.recent.avgMonthly - x.recent.avgMonthly).slice(0, 8);
  const trendSeries: TrendSeries[] = shown.map((s) => ({
    label: labelIn(a, s, tr.lang),
    values: index(s.monthly),
    color: colorOf(s.id),
  }));
  if (a.series.length === 1) {
    const s = a.series[0];
    trendSeries.push({
      label: tr.t("legend.edition", { lang: s.lang }),
      values: index(s.projectMonthly),
      color: "#898781",
      context: true,
    });
  }
  const growthRows = a.series.map((s) => ({
    label: labelIn(a, s, tr.lang),
    growth: s.growth,
    ci: s.ci,
    norm: s.normalizedGrowth,
  }));
  const days = eachDay(w.start, w.end);
  const dailyPanels = a.series.slice(0, 6).map((s) => {
    const spike = new Array<boolean>(days.length).fill(false);
    for (const i of s.daily.spikeIdx) spike[i] = true;
    return {
      label: labelIn(a, s, tr.lang),
      days,
      views: s.daily.views,
      median: s.daily.median,
      spike,
    };
  });
  return { trendSeries, growthRows, dailyPanels };
}

export function chartSvgs(
  a: Analysis,
  tr: Translator,
): { trend: string; growth: string; daily: string } {
  const c = chartInputs(a, tr);
  return {
    trend: trendChart({
      months: a.windows.months,
      series: c.trendSeries,
      recentStartIndex: a.windows.months.indexOf(a.windows.recentMonths[0]),
      locale: tr.locale,
      recentLabel: tr.t("legend.recent"),
    }),
    growth: growthChart({
      rows: c.growthRows,
      labels: { raw: tr.t("legend.raw"), norm: tr.t("legend.norm") },
    }),
    daily: dailyChart({
      panels: c.dailyPanels,
      locale: tr.locale,
      labels: {
        daily: tr.t("legend.daily"),
        median: tr.t("legend.median"),
        spike: tr.t("legend.spike"),
      },
    }),
  };
}
