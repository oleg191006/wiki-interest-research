import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { arg, loadEvalCases } from "./lib/cases.ts";
import { runSuite } from "./lib/suite.ts";
import { OpenRouterRunner } from "./runners/openrouter-runner.ts";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const model = arg("model", "qwen/qwen3-coder:free")!;
const baseUrl = arg("base-url", process.env.OPENAI_BASE_URL ?? "https://openrouter.ai/api/v1")!;
const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Set OPENROUTER_API_KEY (or OPENAI_API_KEY with --base-url).");
  process.exit(2);
}
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

const runner = new OpenRouterRunner({
  model,
  skillDir,
  baseUrl,
  apiKey,
  maxSteps: Number(arg("max-steps", "30")),
});
await runSuite(
  runner,
  loadEvalCases(skillDir, arg("cases")?.split(",")),
  root,
  `Eval run: ${model} via ${baseUrl} (${stamp})`,
);
