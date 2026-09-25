import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEvalCases } from "./lib/cases.ts";
import { grade } from "./lib/grade.ts";
import { resultRow, resultsTable } from "./lib/results-table.ts";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runDir = resolve(process.argv[2] ?? "");
const cases = loadEvalCases(skillDir);

const rows: string[] = [];
for (const name of readdirSync(runDir)) {
  const file = join(runDir, name, "grading.json");
  if (!existsSync(file)) continue;
  const saved = JSON.parse(readFileSync(file, "utf8"));
  const evalCase = cases.find((c) => c.id === saved.case);
  if (!evalCase) continue;
  const started = statSync(join(runDir, name)).birthtimeMs;
  const checks = grade(
    evalCase.expect,
    { toolCalls: saved.toolCalls, finalText: saved.finalText, meta: saved.meta },
    join(runDir, name),
    started,
  );
  writeFileSync(file, JSON.stringify({ ...saved, expectations: checks }, null, 2));
  rows.push(
    resultRow({ id: saved.case, checks, toolCalls: saved.toolCalls.length, meta: saved.meta }),
  );
}
const report = resultsTable(`Re-graded: ${runDir}`, rows);
writeFileSync(join(runDir, "results.md"), report);
console.log(report);
