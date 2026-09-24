import { eachDay, lastCompleteMonth } from "../../domain/calendar.ts";
import type { Clock } from "../../domain/clock.ts";
import { InputError } from "../../domain/errors.ts";
import { analyzeSeries } from "../../domain/trend/analyze-series.ts";
import type { Flag, SeriesInput, SeriesResult } from "../../domain/trend/model.ts";
import { makeWindows, type Windows } from "../../domain/trend/windows.ts";
import type { PageviewsApi } from "../../infrastructure/wikimedia/pageviews-api.ts";
import type { ParsedArgs } from "../args.ts";
import type { Command, Output } from "../command.ts";

export interface AnalyzeDeps {
  pageviews: PageviewsApi;
  clock: Clock;
  output: Output;
}

/**
 * Draft version: one article, one language, plain text. Topic resolution through Wikidata,
 * several languages and the shareable report arrive on day 3.
 */
export class AnalyzeCommand implements Command {
  readonly name = "analyze";
  private readonly deps: AnalyzeDeps;

  constructor(deps: AnalyzeDeps) {
    this.deps = deps;
  }

  async run(args: ParsedArgs): Promise<number> {
    const { pageviews, clock, output } = this.deps;
    const title = args.value("article") ?? args.positional[0];
    if (!title) {
      throw new InputError(
        "An article title is required.",
        'Example: analyze --article "Астрономія" --lang uk',
      );
    }
    const lang = (args.value("lang") ?? "uk").toLowerCase();
    const project = `${lang}.wikipedia.org`;
    const windows = makeWindows(
      lastCompleteMonth(clock.today()),
      args.positiveInt("months", 24),
      args.positiveInt("window", 12),
    );
    const { start, end } = windows;

    output.log(`Loading ${title} (${project}) for ${start}..${end}`);
    // Desktop series are loaded too: a topic whose desktop share jumps while the edition's does
    // not is the main sign of automated traffic.
    const [views, desktop, projViews, projDesktop] = await Promise.all([
      pageviews.articleDaily(project, title, "all-access", start, end),
      pageviews.articleDaily(project, title, "desktop", start, end),
      pageviews.editionDaily(project, "all-access", start, end),
      pageviews.editionDaily(project, "desktop", start, end),
    ]);

    const series: SeriesInput = {
      id: `${lang}:${title}`,
      topic: title,
      lang,
      days: eachDay(start, end),
      views,
      desktop,
      projViews,
      projDesktop,
    };

    output.print(report(analyzeSeries(series, windows), project, windows));
    return 0;
  }
}

function report(r: SeriesResult, project: string, w: Windows): string {
  const range = (m: string[]) => `${m[0]}..${m.at(-1)}`;
  return [
    `${r.topic} — ${project}`,
    `  recent   ${range(w.recentMonths)}: ${int(r.recent.total)} views,` +
      ` median day ${int(r.recent.medianDaily)}`,
    `  baseline ${range(w.baselineMonths)}: ${int(r.baseline.total)} views,` +
      ` median day ${int(r.baseline.medianDaily)}`,
    ``,
    `  verdict          ${r.verdict}, ${r.confidence} confidence`,
    ``,
    `  growth           ${pct(r.growth)}  ${range95(r.ci)}`,
    `  edition growth   ${pct(r.projectGrowth)}`,
    `  normalized       ${pct(r.normalizedGrowth)}  ${range95(r.normCi)}` +
      `  (${r.normVerdict} vs the whole edition)`,
    `  median day       ${pct(r.growthMedianDay)}`,
    `  months up        ${r.monthsUp}/${r.monthsCompared}` +
      `  (sign test p = ${r.signP.toFixed(3)})`,
    `  desktop share    ${share(r.baseline.desktopShare)} -> ${share(r.recent.desktopShare)}` +
      `  (edition ${share(r.baseline.projectDesktopShare)} -> ${share(r.recent.projectDesktopShare)})`,
    ``,
    ...spikeLines(r),
    ...yearLines(r),
    ...seasonLines(r),
    ``,
    ...flagLines(r.flags),
  ].join("\n");
}

/** What is left of the growth once viral days are capped, and which days those were. */
function spikeLines(r: SeriesResult): string[] {
  const lines = [
    `  growth despiked  ${pct(r.growthDespiked)}  (spike days capped at their threshold)`,
    `  spikes recent    ${r.spikes.length} found, ${pct(r.spikeShareRecent)} of the period's views`,
  ];
  for (const spike of r.spikes.slice(0, 3)) {
    lines.push(
      `    ${spike.date}: ${int(spike.views)} views, ${spike.ratio.toFixed(1)}x the local median`,
    );
  }
  return lines;
}

/** Year-by-year totals: the long view behind a single year-over-year number. */
function yearLines(r: SeriesResult): string[] {
  if (!r.yearly) return [];
  return [
    ``,
    `  year by year`,
    ...r.yearly.map(
      (y) => `    ${y.from}..${y.to}: ${int(y.total).padStart(9)} views  ${pct(y.growth)}`,
    ),
  ];
}

/** The repeating yearly shape, when there is enough history to see one. */
function seasonLines(r: SeriesResult): string[] {
  if (!r.seasonality) return [];
  const list = (xs: Array<{ month: number; index: number }>) =>
    xs.map((x) => `${MONTHS[x.month - 1]} ${pct(x.index - 1)}`).join(", ") || "none";
  return [
    ``,
    `  seasonal peaks   ${list(r.seasonality.peaks)}`,
    `  seasonal troughs ${list(r.seasonality.troughs)}`,
  ];
}

/** Trust checks that fired, with the numbers that made them fire. */
function flagLines(flags: Flag[]): string[] {
  if (!flags.length) return ["  trust            no warnings"];
  return [
    "  trust",
    ...flags.map((f) => {
      const params = Object.entries(f.params)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      return `    ${f.severity} ${f.code}${params ? ` (${params})` : ""}`;
    }),
  ];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const int = (n: number) => Math.round(n).toLocaleString("en-US");
const share = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct = (v: number | null) =>
  v === null ? "n/a" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
const range95 = (ci: [number, number] | null) =>
  ci === null ? "" : `[95%: ${pct(ci[0])} … ${pct(ci[1])}]`;
