import { sum } from "../stats.ts";
import type { MonthIndex } from "./month-index.ts";
import type { PeriodStats, SeriesInput } from "./model.ts";
import type { Windows } from "./windows.ts";

export interface ComparedPeriods {
  recent: PeriodStats;
  baseline: PeriodStats;
  recentPositions: number[];
  baselinePositions: number[];
}

/** Year-over-year change: point estimates and month-by-month agreement. */
export interface YearOverYear {
  growth: number | null;
  projectGrowth: number | null; // the whole language edition
  normalizedGrowth: number | null; // topic relative to the whole edition
  growthMedianDay: number | null;
  monthsUp: number;
  monthsCompared: number;
  recentMonthTotals: number[];
  baselineMonthTotals: number[];
}

export function compareYearOverYear(
  s: SeriesInput,
  w: Windows,
  index: MonthIndex,
  p: ComparedPeriods,
): YearOverYear {
  const { recent, baseline } = p;
  const projR = sum(p.recentPositions.map((i) => s.projViews[i]));
  const projB = sum(p.baselinePositions.map((i) => s.projViews[i]));

  const growth = baseline.total > 0 ? recent.total / baseline.total - 1 : null;
  const projectGrowth = projB > 0 ? projR / projB - 1 : null;
  const normalizedGrowth =
    growth !== null && projectGrowth !== null ? (1 + growth) / (1 + projectGrowth) - 1 : null;
  const growthMedianDay =
    baseline.medianDaily > 0 ? recent.medianDaily / baseline.medianDaily - 1 : null;

  // Month pairs: each recent month vs the same calendar month a year earlier.
  const r = w.recentMonths.map((m) => index.total(s.views, m));
  const b = w.baselineMonths.map((m) => index.total(s.views, m));
  let monthsUp = 0;
  let monthsCompared = 0;
  r.forEach((v, i) => {
    if (v !== b[i]) monthsCompared++;
    if (v > b[i]) monthsUp++;
  });

  return {
    growth,
    projectGrowth,
    normalizedGrowth,
    growthMedianDay,
    monthsUp,
    monthsCompared,
    recentMonthTotals: r,
    baselineMonthTotals: b,
  };
}
