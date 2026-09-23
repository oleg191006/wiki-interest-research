import { CONSISTENT_SHARE, LOW_VOLUME, VERY_LOW_VOLUME } from "../thresholds.ts";
import {
  direction,
  warning,
  type CheckContext,
  type Finding,
  type TrustCheck,
} from "./trust-check.ts";

/** Nothing to compare with: no views a year earlier. */
export class NoBaselineCheck implements TrustCheck {
  evaluate(ctx: CheckContext): Finding | null {
    return ctx.yoy.growth === null ? warning("no_baseline", {}, 0) : null;
  }
}

/** A handful of readers can swing percentages of a tiny series. */
export class VolumeCheck implements TrustCheck {
  evaluate(ctx: CheckContext): Finding | null {
    const medianDaily = ctx.periods.recent.medianDaily;
    if (medianDaily < VERY_LOW_VOLUME) {
      return warning("very_low_volume", { median: Math.round(medianDaily) }, 2);
    }
    if (medianDaily < LOW_VOLUME) {
      return warning("low_volume", { median: Math.round(medianDaily) }, 1);
    }
    return null;
  }
}

/** A real trend shows up in most months, not in one or two. */
export class MonthConsistencyCheck implements TrustCheck {
  evaluate(ctx: CheckContext): Finding | null {
    const dir = direction(ctx);
    if (dir === null) return null;
    const { monthsUp, monthsCompared } = ctx.yoy;
    const agreeing = dir > 0 ? monthsUp : monthsCompared - monthsUp;
    if (monthsCompared > 0 && agreeing / monthsCompared < CONSISTENT_SHARE) {
      return warning("inconsistent_months", { agree: agreeing, n: monthsCompared }, 1);
    }
    return null;
  }
}
