import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface EvalCase {
  id: string;
  prompt: string;
  follow_up?: string;
  expected_output?: string;
  expect: string[];
}

export function loadEvalCases(skillDir: string, only?: string[]): EvalCase[] {
  const cases = JSON.parse(readFileSync(join(skillDir, "evals", "evals.json"), "utf8"))
    .evals as EvalCase[];
  return cases.filter((c) => !only || only.includes(c.id));
}

export function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}
