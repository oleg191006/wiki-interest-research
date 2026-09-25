import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EvalCase } from "./cases.ts";
import { grade } from "./grade.ts";
import { resultRow, resultsTable } from "./results-table.ts";
import type { Transcript } from "./transcript.ts";

export interface RunOutcome {
  transcript: Transcript;
  log: { file: string; content: string };
}

export interface AgentRunner {
  readonly model: string;
  prepare?(caseDir: string): void;
  run(evalCase: EvalCase, caseDir: string): Promise<RunOutcome>;
}

/** Runs every case in its own folder, grades it, and writes results.md next to the runs. */
export async function runSuite(
  runner: AgentRunner,
  cases: EvalCase[],
  root: string,
  title: string,
): Promise<void> {
  const rows: string[] = [];
  for (const c of cases) {
    const dir = join(root, c.id);
    mkdirSync(dir, { recursive: true });
    runner.prepare?.(dir);
    const started = Date.now();
    process.stderr.write(`[${c.id}] running ${runner.model}…\n`);

    const outcome = await runner.run(c, dir);
    writeFileSync(join(dir, outcome.log.file), outcome.log.content);
    const checks = grade(c.expect, outcome.transcript, dir, started);
    writeFileSync(
      join(dir, "grading.json"),
      JSON.stringify(
        {
          case: c.id,
          model: runner.model,
          meta: outcome.transcript.meta,
          finalText: outcome.transcript.finalText,
          toolCalls: outcome.transcript.toolCalls,
          expectations: checks,
        },
        null,
        2,
      ),
    );

    const passed = checks.filter((x) => x.passed).length;
    const error = outcome.transcript.meta.error ? ` (error: ${outcome.transcript.meta.error})` : "";
    process.stderr.write(
      `[${c.id}] ${passed}/${checks.length} checks, ${outcome.transcript.toolCalls.length} tool calls, $${(outcome.transcript.meta.costUsd ?? 0).toFixed(3)}${error}\n`,
    );
    rows.push(
      resultRow({
        id: c.id,
        checks,
        toolCalls: outcome.transcript.toolCalls.length,
        meta: outcome.transcript.meta,
      }),
    );
  }
  const report = resultsTable(title, rows);
  writeFileSync(join(root, "results.md"), report);
  console.log(report);
  console.log(`Transcripts and outputs: ${root}`);
}
