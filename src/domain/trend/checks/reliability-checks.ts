import { median, sum } from "../../stats.ts";
import { BOT_DESKTOP_SHIFT, CONSISTENT_SHARE, LOW_VOLUME, VERY_LOW_VOLUME } from "../thresholds.ts";
import {
  direction,
  percentPoints as pct,
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

/** The change disappears (or halves) once spike days are capped. */
export class SpikeDrivenCheck implements TrustCheck {
  evaluate(ctx: CheckContext): Finding | null {
    const dir = direction(ctx);
    const growth = ctx.yoy.growth;
    if (dir === null || growth === null) return null;
    const despiked = ctx.growthDespiked;
    const survives =
      despiked !== null &&
      Math.sign(despiked) === dir &&
      Math.abs(despiked) >= 0.5 * Math.abs(growth);
    if (survives) return null;
    return warning("spike_driven", { growth: pct(growth), despiked: pct(despiked ?? 0) }, 1);
  }
}

/** Relative to the whole edition the topic moves the other way: the platform, not the topic, changed. */
export class PlatformOppositeCheck implements TrustCheck {
  evaluate(ctx: CheckContext): Finding | null {
    const dir = direction(ctx);
    const { normalizedGrowth, projectGrowth } = ctx.yoy;
    if (dir === null || normalizedGrowth === null || Math.sign(normalizedGrowth) === dir)
      return null;
    return warning(
      "platform_opposite",
      { project: pct(projectGrowth ?? 0), normalized: pct(normalizedGrowth) },
      1,
    );
  }
}

/**
 * Automated traffic: the article's desktop share moves very differently from the edition's,
 * or recent spikes are almost desktop-only on a mostly-mobile article.
 */
export class AutomatedTrafficCheck implements TrustCheck {
  evaluate(ctx: CheckContext): Finding | null {
    const { recent, baseline, recentPositions } = ctx.periods;
    const { views, desktop } = ctx.input;
    const ownShift = recent.desktopShare - baseline.desktopShare;
    const editionShift = recent.projectDesktopShare - baseline.projectDesktopShare;
    const shiftGap = ownShift - editionShift;
    const desktopSpikeExcess = sum(
      recentPositions
        .filter((i) => ctx.spikes.isSpike[i] && views[i] > 0 && desktop[i] / views[i] >= 0.85)
        .map((i) => views[i] - ctx.spikes.threshold[i]),
    );
    const botShift =
      Math.abs(shiftGap) >= BOT_DESKTOP_SHIFT &&
      Math.max(recent.desktopShare, baseline.desktopShare) >= 0.5;
    const botSpikes =
      baseline.desktopShare < 0.6 && recent.total > 0 && desktopSpikeExcess / recent.total >= 0.05;
    if (!botShift && !botSpikes) return null;
    return warning(
      "bot_suspected",
      {
        deskRecent: pct(recent.desktopShare),
        deskBase: pct(baseline.desktopShare),
        projRecent: pct(recent.projectDesktopShare),
        projBase: pct(baseline.projectDesktopShare),
      },
      1,
    );
  }
}

/**
 * New or renamed articles make growth look bigger than it is. Creation dates come from the
 * MediaWiki API in step 3.4; until then only the shape of the series is used.
 */
export class NewArticleCheck implements TrustCheck {
  evaluate(ctx: CheckContext): Finding | null {
    const month = this.abruptStart(ctx);
    return month ? warning("abrupt_start", { month }, 2) : null;
  }

  /** First month with real traffic, if views were near zero before it and it is inside the comparison. */
  private abruptStart(ctx: CheckContext): string | null {
    const w = ctx.windows;
    const ref = median(ctx.yoy.recentMonthTotals);
    if (ref <= 0) return null;
    const first = ctx.monthly.findIndex((v) => v >= 0.1 * ref);
    const silentBefore = ctx.monthly.slice(0, first).every((v) => v < 0.05 * ref);
    if (first > 0 && silentBefore && w.months[first] >= w.baselineMonths[0]) return w.months[first];
    return null;
  }
}
