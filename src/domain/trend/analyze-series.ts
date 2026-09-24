import { DEFAULT_TRUST_CHECKS, runTrustChecks, type TrustCheck } from "./checks/index.ts";
import { compareYearOverYear } from "./growth.ts";
import type { SeriesInput, SeriesResult } from "./model.ts";
import { MonthIndex } from "./month-index.ts";
import { periodStats } from "./period.ts";
import { seasonality, yearlyHistory } from "./seasonality.ts";
import { SpikeDetection } from "./spikes.ts";
import { classify, confidenceOf } from "./verdict.ts";
import type { Windows } from "./windows.ts";

export function analyzeSeries(
  s: SeriesInput,
  w: Windows,
  checks: readonly TrustCheck[] = DEFAULT_TRUST_CHECKS,
): SeriesResult {
  const index = new MonthIndex(s.days);
  const recentPositions = index.positionsOf(w.recentMonths);
  const baselinePositions = index.positionsOf(w.baselineMonths);
  const periods = {
    recent: periodStats(recentPositions, s),
    baseline: periodStats(baselinePositions, s),
    recentPositions,
    baselinePositions,
  };
  const yoy = compareYearOverYear(s, w, index, periods);

  const spikes = new SpikeDetection(s.views);
  const growthDespiked = spikes.despikedGrowth(recentPositions, baselinePositions);
  const spikeShareRecent = spikes.excessShare(recentPositions, periods.recent.total);
  const topSpikes = spikes.top(s);
  const season = seasonality(w, index, spikes.capped, periods.recent.medianDaily);
  const monthly = w.months.map((m) => index.total(s.views, m));

  const verdict = classify(yoy.growth, yoy.ci);
  const { flags, penalty } = runTrustChecks(
    {
      input: s,
      windows: w,
      verdict,
      periods,
      yoy,
      spikes,
      topSpikes,
      growthDespiked,
      spikeShareRecent,
      monthly,
      seasonality: season,
    },
    checks,
  );

  return {
    id: s.id,
    topic: s.topic,
    lang: s.lang,
    monthly,
    projectMonthly: w.months.map((m) => index.total(s.projViews, m)),
    recent: periods.recent,
    baseline: periods.baseline,
    growth: yoy.growth,
    ci: yoy.ci,
    growthDespiked,
    growthMedianDay: yoy.growthMedianDay,
    projectGrowth: yoy.projectGrowth,
    normalizedGrowth: yoy.normalizedGrowth,
    normCi: yoy.normCi,
    monthsUp: yoy.monthsUp,
    monthsCompared: yoy.monthsCompared,
    signP: yoy.signP,
    spikes: topSpikes,
    spikeShareRecent,
    seasonality: season,
    yearly: yearlyHistory(w, index, s.views),
    verdict,
    normVerdict: classify(yoy.normalizedGrowth, yoy.normCi),
    confidence: confidenceOf(verdict, penalty),
    flags,
    daily: { days: s.days, views: s.views, median: spikes.median, spike: spikes.isSpike },
  };
}
