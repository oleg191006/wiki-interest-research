import { eachDay, lastCompleteMonth } from "../../domain/calendar.ts";
import type { Clock } from "../../domain/clock.ts";
import { InputError } from "../../domain/errors.ts";
import {
  compareYearOverYear,
  type ComparedPeriods,
  type YearOverYear,
} from "../../domain/trend/growth.ts";
import { MonthIndex } from "../../domain/trend/month-index.ts";
import type { SeriesInput } from "../../domain/trend/model.ts";
import { periodStats } from "../../domain/trend/period.ts";
import { makeWindows } from "../../domain/trend/windows.ts";
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
    const [views, projViews] = await Promise.all([
      pageviews.articleDaily(project, title, "all-access", windows.start, windows.end),
      pageviews.editionDaily(project, "all-access", windows.start, windows.end),
    ]);

    const series: SeriesInput = {
      id: `${lang}:${title}`,
      topic: title,
      lang,
      days,
      views,
      projViews,
    };
    const index = new MonthIndex(days);
    const recentPositions = index.positionsOf(windows.recentMonths);
    const baselinePositions = index.positionsOf(windows.baselineMonths);
    const periods = {
      recent: periodStats(recentPositions, series),
      baseline: periodStats(baselinePositions, series),
      recentPositions,
      baselinePositions,
    };
    const yoy = compareYearOverYear(series, windows, index, periods);

    output.print(
      report(title, project, windows.recentMonths, windows.baselineMonths, periods, yoy),
    );
    return 0;
  }
}

function report(
  title: string,
  project: string,
  recentMonths: string[],
  baselineMonths: string[],
  p: ComparedPeriods,
  yoy: YearOverYear,
): string {
  const range = (m: string[]) => `${m[0]}..${m.at(-1)}`;
  return [
    `${title} — ${project}`,
    `  recent   ${range(recentMonths)}: ${int(p.recent.total)} views, median day ${int(p.recent.medianDaily)}`,
    `  baseline ${range(baselineMonths)}: ${int(p.baseline.total)} views, median day ${int(p.baseline.medianDaily)}`,
    ``,
    `  growth           ${pct(yoy.growth)}`,
    `  edition growth   ${pct(yoy.projectGrowth)}`,
    `  normalized       ${pct(yoy.normalizedGrowth)}   (topic relative to the whole edition)`,
    `  median day       ${pct(yoy.growthMedianDay)}`,
    `  months up        ${yoy.monthsUp}/${yoy.monthsCompared}`,
  ].join("\n");
}

const int = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (v: number | null) =>
  v === null ? "n/a" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
