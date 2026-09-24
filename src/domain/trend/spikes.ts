import { rollingMedian, sum } from "../stats.ts";
import type { SeriesInput, Spike } from "./model.ts";
import { SPIKE_HALF_WINDOW, SPIKE_MIN_VIEWS, SPIKE_MULTIPLE } from "./thresholds.ts";

/**
 * Days far above the local (29-day) median. `capped` replaces each spike day with the threshold,
 * which gives a spike-free version of the series for "is the growth more than a few viral days?".
 */
export class SpikeDetection {
  readonly median: number[];
  readonly threshold: number[];
  readonly isSpike: boolean[];
  readonly capped: number[];
  private readonly views: number[];

  constructor(views: number[]) {
    this.views = views;
    this.median = rollingMedian(views, SPIKE_HALF_WINDOW);
    this.threshold = this.median.map((m) =>
      Math.max(SPIKE_MULTIPLE * m, m + 5 * Math.sqrt(Math.max(m, 1))),
    );
    this.isSpike = views.map((v, i) => v > this.threshold[i] && v >= SPIKE_MIN_VIEWS);
    this.capped = views.map((v, i) => (this.isSpike[i] ? this.threshold[i] : v));
  }

  despikedGrowth(recentPositions: number[], baselinePositions: number[]): number | null {
    const cappedR = sum(recentPositions.map((i) => this.capped[i]));
    const cappedB = sum(baselinePositions.map((i) => this.capped[i]));
    return cappedB > 0 ? cappedR / cappedB - 1 : null;
  }

  excessShare(positions: number[], total: number): number {
    const excess = sum(
      positions.filter((i) => this.isSpike[i]).map((i) => this.views[i] - this.threshold[i]),
    );
    return total > 0 ? excess / total : 0;
  }

  spikeDays(positions: number[]): number[] {
    return positions.filter((i) => this.isSpike[i]);
  }

  top(s: SeriesInput, count = 5): Spike[] {
    return s.views
      .map((v, i) => ({ i, v }))
      .filter(({ i }) => this.isSpike[i])
      .sort((x, y) => y.v - this.threshold[y.i] - (x.v - this.threshold[x.i]))
      .slice(0, count)
      .map(({ i, v }) => ({
        date: s.days[i],
        views: v,
        ratio: v / Math.max(this.median[i], 1),
        desktopShare: v > 0 ? s.desktop[i] / v : 0,
      }));
  }
}
