import {
  note,
  percentPoints as pct,
  type CheckContext,
  type Finding,
  type TrustCheck,
} from "./trust-check.ts";

export class SpikesPresentNote implements TrustCheck {
  evaluate(ctx: CheckContext): Finding | null {
    if (!ctx.topSpikes.length || ctx.spikeShareRecent < 0.02) return null;
    return note("spikes_present", {
      count: ctx.spikes.spikeDays(ctx.periods.recentPositions).length,
      share: pct(ctx.spikeShareRecent),
    });
  }
}

export class PlatformContextNote implements TrustCheck {
  evaluate(ctx: CheckContext): Finding | null {
    const { projectGrowth, normalizedGrowth } = ctx.yoy;
    if (projectGrowth === null || normalizedGrowth === null || Math.abs(projectGrowth) < 0.03) {
      return null;
    }
    return note("platform_context", {
      project: pct(projectGrowth),
      normalized: pct(normalizedGrowth),
    });
  }
}

export class SeasonalNote implements TrustCheck {
  evaluate(ctx: CheckContext): Finding | null {
    const peaks = ctx.seasonality?.peaks ?? [];
    if (!peaks.length) return null;
    return note("seasonal", {
      peaks: peaks.map((p) => p.month).join(","),
      top: pct(peaks[0].index - 1),
    });
  }
}

export class RedirectShareNote implements TrustCheck {
  evaluate(ctx: CheckContext): Finding | null {
    const share = ctx.input.redirectShare ?? 0;
    return share >= 0.1 ? note("redirect_share", { share: pct(share) }) : null;
  }
}
