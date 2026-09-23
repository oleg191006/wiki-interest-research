import type { Confidence, Verdict } from "./model.ts";
import { FLAT_BAND, MATERIAL_CHANGE, MAX_CONFIDENCE_POINTS } from "./thresholds.ts";

/** Direction of a change, decided by its 95% interval, not by the point estimate alone. */
export function classify(g: number | null, ci: [number, number] | null): Verdict {
  if (g === null || ci === null || !Number.isFinite(ci[0]) || !Number.isFinite(ci[1])) {
    return "insufficient";
  }
  if (ci[0] > 0 && g >= MATERIAL_CHANGE) return "rising";
  if (ci[1] < 0 && g <= -MATERIAL_CHANGE) return "falling";
  if (ci[0] >= -FLAT_BAND && ci[1] <= FLAT_BAND) return "flat";
  return "unclear";
}

/** Confidence starts at MAX_CONFIDENCE_POINTS, each failed trust check subtracts its penalty. */
export function confidenceOf(verdict: Verdict, penalty: number): Confidence {
  if (verdict === "unclear" || verdict === "insufficient") return "low";
  const points = MAX_CONFIDENCE_POINTS - penalty;
  return points >= 3 ? "high" : points === 2 ? "medium" : "low";
}
