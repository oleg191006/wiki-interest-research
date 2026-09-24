import { join, resolve } from "node:path";
import type { Analysis } from "../../application/analysis-model.ts";
import type { AnalyzeTopics } from "../../application/analyze/analyze-topics.ts";
import type { AnalysisStore } from "../../application/ports.ts";
import { parseUiLang } from "../../domain/languages/display-names.ts";
import { normalizeLang } from "../../domain/languages/language.ts";
import type { RequestStats } from "../../infrastructure/http/fetch-transport.ts";
import type { ArtifactWriter } from "../../presentation/export/artifact-writer.ts";
import { slug } from "../../presentation/format.ts";
import { Translator } from "../../presentation/i18n/translator.ts";
import { quoteArg } from "../../presentation/text/command-line.ts";
import type { SummaryView } from "../../presentation/text/summary-view.ts";
import type { ParsedArgs } from "../args.ts";
import type { Command, Output } from "../command.ts";

export interface AnalyzeCommandDeps {
  useCase: AnalyzeTopics;
  store: AnalysisStore;
  artifacts: ArtifactWriter;
  summary: SummaryView;
  stats: RequestStats;
  outputRoot: string;
  output: Output;
}

/** Default run folder: <topics>_<langs>_<months>m, so reruns of the same question land in one place. */
export function defaultRunFolder(a: Analysis): string {
  const topics = a.topics
    .map((tr) => slug(tr.name))
    .join("+")
    .slice(0, 60);
  return `${topics}_${a.params.langs.join("-")}_${a.windows.months.length}m`;
}

/** analyze: run the analysis, save analysis.json + CSV, print summary.md for the agent. */
export class AnalyzeCommand implements Command {
  readonly name = "analyze";
  private readonly deps: AnalyzeCommandDeps;

  constructor(deps: AnalyzeCommandDeps) {
    this.deps = deps;
  }

  async run(args: ParsedArgs): Promise<number> {
    const { useCase, store, artifacts, summary, stats, output } = this.deps;
    const started = Date.now();
    const ui = parseUiLang(args.value("ui-lang"));
    const analysis = await useCase.execute({
      topics: [...args.values("topic"), ...args.positional.filter((p) => p.includes("="))],
      langs: args.values("langs").join(","),
      months: args.positiveInt("months", 24),
      window: args.positiveInt("window", 12),
      weights: args.value("weights"),
      searchLang: normalizeLang(args.value("search-lang") ?? "en"),
      redirects: !args.has("no-redirects"),
      uiLang: ui,
      command: `analyze ${args.argv.slice(1).map(quoteArg).join(" ")}`,
    });

    const outDir = resolve(
      args.value("out") ?? join(this.deps.outputRoot, defaultRunFolder(analysis)),
    );
    store.save(outDir, analysis);
    artifacts.writeData(outDir, analysis);
    artifacts.writeCharts(outDir, analysis, new Translator(ui));
    const markdown = summary.render(analysis, outDir);
    artifacts.writeSummary(outDir, markdown);

    output.print(markdown);
    output.log(
      `Done in ${((Date.now() - started) / 1000).toFixed(1)}s ` +
        `(${stats.requests} requests, ${stats.cacheHits} cache hits).`,
    );
    return 0;
  }
}
