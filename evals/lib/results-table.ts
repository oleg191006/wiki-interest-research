import type { CheckResult } from "./checks.ts";
import type { RunMeta } from "./transcript.ts";

export interface ResultRow {
  id: string;
  checks: CheckResult[];
  toolCalls: number;
  meta: RunMeta;
}

const failures = (checks: CheckResult[]) =>
  checks
    .filter((c) => !c.passed)
    .map((c) => `${c.text.split(":")[0]} (${c.evidence.slice(0, 80)})`)
    .join("; ") || "—";

export function resultRow(r: ResultRow): string {
  const passed = r.checks.filter((c) => c.passed).length;
  const seconds = ((r.meta.durationMs ?? 0) / 1000).toFixed(0);
  return `| ${r.id} | ${passed}/${r.checks.length} | ${r.toolCalls} | ${seconds}s | $${(r.meta.costUsd ?? 0).toFixed(3)} | ${failures(r.checks)} |`;
}

export function resultsTable(title: string, rows: string[]): string {
  return [
    `# ${title}`,
    "",
    "| case | checks | tool calls | time | cost | failed checks |",
    "|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}
