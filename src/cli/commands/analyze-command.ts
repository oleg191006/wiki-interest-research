import { eachDay, lastCompleteMonth } from "../../domain/calendar.ts";
import type { Clock } from "../../domain/clock.ts";
import { InputError } from "../../domain/errors.ts";
import {
  compareYearOverYear,
  type ComparedPeriods,
  type YearOverYear,
} from "../../domain/trend/growth.ts";
import { DEFAULT_TRUST_CHECKS, runTrustChecks } from "../../domain/trend/checks/index.ts";
import { MonthIndex } from "../../domain/trend/month-index.ts";
import type { Flag, SeriesInput, Verdict } from "../../domain/trend/model.ts";
import { periodStats } from "../../domain/trend/period.ts";
import { SpikeDetection } from "../../domain/trend/spikes.ts";
import { classify } from "../../domain/trend/verdict.ts";
import type { Windows } from "../../domain/trend/windows.ts";
import { makeWindows } from "../../domain/trend/windows.ts";
import type { PageviewsApi } from "../../infrastructure/wikimedia/pageviews-api.ts";
import type { ParsedArgs } from "../args.ts";
import type { Command, Output } from "../command.ts";

export interface AnalyzeDeps {
  pageviews: PageviewsApi;
  clock: Clock;
  output: Output;
}

/** Everything the draft text report needs. */
interface Analysis {
  series: SeriesInput;
  project: string;
  windows: Windows;
  periods: ComparedPeriods;
  yoy: YearOverYear;
  spikes: SpikeDetection;
  verdict: Verdict;
  flags: Flag[];
}

/**
 * Draft version: one article, one language, plain text. Topic resolution through Wikidata,
 * several languages and the report arrive on day 3.
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

    output.log(`Loading ${title} (${project}) for ${windows.start}..${windows.end}`);
    const days = eachDay(windows.start, windows.end);
    const { start, end } = windows;
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
      days,
      views,
      desktop,
      projViews,
      projDesktop,
    };
    const index = new MonthIndex(days);
    const recentPositions = index.positionsOf(windows.recentMonths);
    const baselinePositions = index.positionsOf(windows.baselineMonths);
    const periods: ComparedPeriods = {
      recent: periodStats(recentPositions, series),
      baseline: periodStats(baselinePositions, series),
      recentPositions,
      baselinePositions,
    };

    const yoy = compareYearOverYear(series, windows, index, periods);
    const spikes = new SpikeDetection(views);
    const verdict = classify(yoy.growth, yoy.ci);
    const { flags } = runTrustChecks(
      {
        input: series,
        windows,
        verdict,
        periods,
        yoy,
        spikes,
        topSpikes: spikes.top(series),
        growthDespiked: spikes.despikedGrowth(recentPositions, baselinePositions),
        spikeShareRecent: spikes.excessShare(recentPositions, periods.recent.total),
        monthly: windows.months.map((m) => index.total(views, m)),
      },
      DEFAULT_TRUST_CHECKS,
    );

    output.print(report({ series, project, windows, periods, yoy, spikes, verdict, flags }));
    return 0;
  }
}

function report(a: Analysis): string {
  const { periods: p, yoy, windows } = a;
  const range = (m: string[]) => `${m[0]}..${m.at(-1)}`;
  return [
    `${a.series.topic} — ${a.project}`,
    `  recent   ${range(windows.recentMonths)}: ${int(p.recent.total)} views,` +
      ` median day ${int(p.recent.medianDaily)}`,
    `  baseline ${range(windows.baselineMonths)}: ${int(p.baseline.total)} views,` +
      ` median day ${int(p.baseline.medianDaily)}`,
    ``,
    `  verdict          ${a.verdict}`,
    ``,
    `  growth           ${pct(yoy.growth)}  ${range95(yoy.ci)}`,
    `  edition growth   ${pct(yoy.projectGrowth)}`,
    `  normalized       ${pct(yoy.normalizedGrowth)}  ${range95(yoy.normCi)}` +
      `  (topic vs the whole edition)`,
    `  median day       ${pct(yoy.growthMedianDay)}`,
    `  months up        ${yoy.monthsUp}/${yoy.monthsCompared}` +
      `  (sign test p = ${yoy.signP.toFixed(3)})`,
    `  desktop share    ${share(p.baseline.desktopShare)} -> ${share(p.recent.desktopShare)}` +
      `  (edition ${share(p.baseline.projectDesktopShare)} -> ${share(p.recent.projectDesktopShare)})`,
    ``,
    ...spikeLines(a),
    ``,
    ...flagLines(a.flags),
  ].join("\n");
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

/** What is left of the growth once viral days are capped, and which days those were. */
function spikeLines(a: Analysis): string[] {
  const { spikes, periods: p } = a;
  const despiked = spikes.despikedGrowth(p.recentPositions, p.baselinePositions);
  const share = spikes.excessShare(p.recentPositions, p.recent.total);
  const days = spikes.spikeDays(p.recentPositions).length;
  const lines = [
    `  growth despiked  ${pct(despiked)}  (spike days capped at their threshold)`,
    `  spikes recent    ${days} days, ${pct(share)} of the period's views`,
  ];
  for (const spike of spikes.top(a.series, 3)) {
    lines.push(
      `    ${spike.date}: ${int(spike.views)} views, ${spike.ratio.toFixed(1)}x the local median`,
    );
  }
  return lines;
}

const int = (n: number) => Math.round(n).toLocaleString("en-US");
const share = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct = (v: number | null) =>
  v === null ? "n/a" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
const range95 = (ci: [number, number] | null) =>
  ci === null ? "" : `[95%: ${pct(ci[0])} … ${pct(ci[1])}]`;
