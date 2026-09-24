import type { Analysis, SeriesRecord } from "../../application/analysis-model.ts";
import { AnalyzeTopics } from "../../application/analyze/analyze-topics.ts";
import { parseUiLang } from "../../domain/languages/display-names.ts";
import type { Flag } from "../../domain/trend/model.ts";
import type { ParsedArgs } from "../args.ts";
import type { Command, Output } from "../command.ts";

export interface AnalyzeDeps {
  useCase: AnalyzeTopics;
  launcher: string;
  output: Output;
}

/**
 * analyze: one or more topics across one or more editions. Prints a plain-text summary;
 * the shareable report (charts, PDF) is built by the report command.
 */
export class AnalyzeCommand implements Command {
  readonly name = "analyze";
  private readonly deps: AnalyzeDeps;

  constructor(deps: AnalyzeDeps) {
    this.deps = deps;
  }

  async run(args: ParsedArgs): Promise<number> {
    const analysis = await this.deps.useCase.execute({
      topics: args.values("topic"),
      langs: args.value("langs") ?? "uk",
      months: args.positiveInt("months", 24),
      window: args.positiveInt("window", 12),
      searchLang: args.value("search-lang") ?? "en",
      redirects: !args.has("no-redirects"),
      uiLang: parseUiLang(args.value("ui")),
      command: `${this.deps.launcher} ${args.argv.join(" ")}`,
    });
    this.deps.output.print(report(analysis));
    return 0;
  }
}

function report(a: Analysis): string {
  const lines = [
    `${a.tool} ${a.version} — ${a.windows.start}..${a.windows.end}`,
    `topics: ${a.params.topics.join("; ")}   editions: ${a.params.langs.join(", ")}`,
  ];
  for (const s of a.series) lines.push(``, ...seriesLines(s, a));
  if (a.notes.length) lines.push(``, `notes`, ...a.notes.map((n) => `  - ${n}`));
  return lines.join("\n");
}

function seriesLines(s: SeriesRecord, a: Analysis): string[] {
  const titles = a.topics
    .find((t) => t.name === s.topic)
    ?.articles[s.lang]?.map((x) => x.title)
    .join(", ");
  return [
    `${s.label}  —  ${s.verdict}, ${s.confidence} confidence`,
    `  articles         ${titles ?? "—"}`,
    `  recent           ${int(s.recent.total)} views, median day ${int(s.recent.medianDaily)}`,
    `  baseline         ${int(s.baseline.total)} views, median day ${int(s.baseline.medianDaily)}`,
    `  growth           ${pct(s.growth)}  ${range95(s.ci)}`,
    `  normalized       ${pct(s.normalizedGrowth)}  ${range95(s.normCi)}` +
      `  (edition ${pct(s.projectGrowth)})`,
    `  despiked         ${pct(s.growthDespiked)}`,
    `  months up        ${s.monthsUp}/${s.monthsCompared}  (sign test p = ${s.signP.toFixed(3)})`,
    ...flagLines(s.flags),
  ];
}

function flagLines(flags: Flag[]): string[] {
  if (!flags.length) return ["  trust            no warnings"];
  return flags.map((f) => {
    const params = Object.entries(f.params)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    return `  ${f.severity === "warn" ? "warn" : "note"}             ${f.code}${params ? ` (${params})` : ""}`;
  });
}

const int = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (v: number | null) =>
  v === null ? "n/a" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
const range95 = (ci: [number, number] | null) =>
  ci === null ? "" : `[95%: ${pct(ci[0])} … ${pct(ci[1])}]`;
