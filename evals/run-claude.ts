import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { arg, loadEvalCases } from "./lib/cases.ts";
import { runSuite } from "./lib/suite.ts";
import { ClaudeCodeRunner } from "./runners/claude-code-runner.ts";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const model = arg("model", "claude-haiku-4-5-20251001")!;
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const root = resolve(
  arg(
    "out",
    join(
      skillDir,
      "..",
      "wiki-interest-research-workspace",
      "runs",
      `${stamp}_${model.replace(/[^\w.-]/g, "_")}`,
    ),
  )!,
);

const runner = new ClaudeCodeRunner({
  model,
  skillDir,
  binary: arg("claude", process.env.CLAUDE_BIN ?? "claude")!,
});
await runSuite(
  runner,
  loadEvalCases(skillDir, arg("cases")?.split(",")),
  root,
  `Eval run: ${model} (${stamp})`,
);
