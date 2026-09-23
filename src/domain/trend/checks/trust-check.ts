import type { ComparedPeriods, YearOverYear } from "../growth.ts";
import type { Flag, FlagCode, SeriesInput, Spike, Verdict } from "../model.ts";
import type { SpikeDetection } from "../spikes.ts";
import type { Windows } from "../windows.ts";

/** Everything a trust check may look at: the raw series and the computed measurements. */
export interface CheckContext {
  input: SeriesInput;
  windows: Windows;
  verdict: Verdict;
  periods: ComparedPeriods;
  yoy: YearOverYear;
  spikes: SpikeDetection;
  topSpikes: Spike[];
  growthDespiked: number | null;
  spikeShareRecent: number;
}

export interface Finding {
  flag: Flag;
  penalty: number;
}

export interface TrustCheck {
  evaluate(ctx: CheckContext): Finding | null;
}

export function warning(code: FlagCode, params: Flag["params"], penalty: number): Finding {
  return { flag: { code, severity: "warn", params }, penalty };
}

export function note(code: FlagCode, params: Flag["params"]): Finding {
  return { flag: { code, severity: "info", params }, penalty: 0 };
}

export const percentPoints = (x: number): number => Math.round(x * 100);

export function direction(ctx: CheckContext): 1 | -1 | null {
  if ((ctx.verdict === "rising" || ctx.verdict === "falling") && ctx.yoy.growth !== null) {
    return ctx.verdict === "rising" ? 1 : -1;
  }
  return null;
}
