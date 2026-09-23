import { hashSeed, pairedBootstrap, signTestP, sum } from "../stats.ts";
import type { MonthIndex } from "./month-index.ts";
import type { PeriodStats, SeriesInput } from "./model.ts";
import { BOOTSTRAP_ITERATIONS } from "./thresholds.ts";
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
  ci: [number, number] | null;
  normCi: [number, number] | null;
  monthsUp: number;
  monthsCompared: number;
  signP: number;
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
  const pr = w.recentMonths.map((m) => index.total(s.projViews, m));
  const pb = w.baselineMonths.map((m) => index.total(s.projViews, m));
  let monthsUp = 0;
  let monthsCompared = 0;
  r.forEach((v, i) => {
    if (v !== b[i]) monthsCompared++;
    if (v > b[i]) monthsUp++;
  });

  // The interval comes from resampling month pairs, so it is seeded by the series id and
  // identical on every run.
  let ci: [number, number] | null = null;
  let normCi: [number, number] | null = null;
  if (growth !== null) {
    const boot = pairedBootstrap(r, b, pr, pb, hashSeed(s.id), BOOTSTRAP_ITERATIONS);
    ci = [boot.low, boot.high];
    normCi = [boot.normLow, boot.normHigh];
  }

  return {
    growth,
    projectGrowth,
    normalizedGrowth,
    growthMedianDay,
    ci,
    normCi,
    monthsUp,
    monthsCompared,
    signP: signTestP(monthsUp, monthsCompared),
    recentMonthTotals: r,
    baselineMonthTotals: b,
  };
}
