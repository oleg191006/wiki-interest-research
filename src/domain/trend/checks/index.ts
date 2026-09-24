import type { Flag } from "../model.ts";
import {
  AutomatedTrafficCheck,
  MonthConsistencyCheck,
  NewArticleCheck,
  NoBaselineCheck,
  PlatformOppositeCheck,
  SpikeDrivenCheck,
  VolumeCheck,
} from "./reliability-checks.ts";
import type { CheckContext, TrustCheck } from "./trust-check.ts";

export type { CheckContext, TrustCheck } from "./trust-check.ts";

export const DEFAULT_TRUST_CHECKS: readonly TrustCheck[] = [
  new NoBaselineCheck(),
  new VolumeCheck(),
  new MonthConsistencyCheck(),
  new SpikeDrivenCheck(),
  new PlatformOppositeCheck(),
  new AutomatedTrafficCheck(),
  new NewArticleCheck(),
];

/** Run every check, returns the flags and the total confidence penalty. */
export function runTrustChecks(
  ctx: CheckContext,
  checks: readonly TrustCheck[],
): { flags: Flag[]; penalty: number } {
  const flags: Flag[] = [];
  let penalty = 0;
  for (const check of checks) {
    const finding = check.evaluate(ctx);
    if (!finding) continue;
    flags.push(finding.flag);
    penalty += finding.penalty;
  }
  return { flags, penalty };
}
