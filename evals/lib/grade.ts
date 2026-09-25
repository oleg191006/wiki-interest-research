import { CHECKS, gradeContext, type CheckResult } from "./checks.ts";
import type { Transcript } from "./transcript.ts";

export function grade(
  expect: string[],
  t: Transcript,
  caseDir: string,
  startedAt: number,
): CheckResult[] {
  const ctx = gradeContext(t, caseDir, startedAt);
  return expect.map((name) => {
    const check = CHECKS[name];
    return check ? check(ctx) : { text: name, passed: false, evidence: "unknown check" };
  });
}
