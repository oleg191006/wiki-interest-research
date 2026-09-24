import { eachDay, lastCompleteMonth } from "../../domain/calendar.ts";
import type { Clock } from "../../domain/clock.ts";
import { InputError } from "../../domain/errors.ts";
import type { UiLang } from "../../domain/languages/display-names.ts";
import { parseLangs, type Lang } from "../../domain/languages/language.ts";
import { rankSeries } from "../../domain/ranking/rank-series.ts";
import { parseWeights } from "../../domain/ranking/weights.ts";
import { analyzeSeries } from "../../domain/trend/analyze-series.ts";
import { makeWindows, type Windows } from "../../domain/trend/windows.ts";
import {
  toSeriesRecord,
  type Analysis,
  type EditionContext,
  type TopicReport,
} from "../analysis-model.ts";
import type { ArticleDirectory, EntityCatalog, Log, PageviewSource } from "../ports.ts";
import { seriesLabel } from "../series-label.ts";
import { ArticleResolver, missingArticleNotes } from "./article-resolver.ts";
import { editionContext } from "./edition-context.ts";
import { assembleSeries } from "./series-assembler.ts";
import { TopicResolver } from "./topic-resolver.ts";
import { parseTopic } from "./topic-spec.ts";
import { TrafficLoader, uniqueArticles } from "./traffic-loader.ts";

export const MAX_SERIES = 10;
const TOOL_NAME = "wiki-interest-research";

export interface AnalyzeRequest {
  topics: string[];
  langs: string;
  months: number;
  window: number;
  weights?: string;
  searchLang: string;
  redirects: boolean;
  uiLang: UiLang;
  command: string;
}

export interface AnalyzeDependencies {
  catalog: EntityCatalog;
  directory: ArticleDirectory;
  pageviews: PageviewSource;
  clock: Clock;
  version: string;
  log: Log;
}

export class AnalyzeTopics {
  private readonly topicResolver: TopicResolver;
  private readonly articleResolver: ArticleResolver;
  private readonly trafficLoader: TrafficLoader;
  private readonly pageviews: PageviewSource;
  private readonly clock: Clock;
  private readonly version: string;
  private readonly log: Log;

  constructor(deps: AnalyzeDependencies) {
    this.topicResolver = new TopicResolver(deps.catalog);
    this.articleResolver = new ArticleResolver(deps.directory);
    this.trafficLoader = new TrafficLoader(deps.pageviews, deps.directory);
    this.pageviews = deps.pageviews;
    this.clock = deps.clock;
    this.version = deps.version;
    this.log = deps.log;
  }

  async execute(req: AnalyzeRequest): Promise<Analysis> {
    const { langs, warnings } = parseLangs(req.langs);
    if (!req.topics.length) {
      throw new InputError(
        "No --topic given.",
        'Example: --topic "Astronomy=Q333" (get QIDs with the find command).',
      );
    }
    const specs = req.topics.map(parseTopic);
    assertSeriesLimit(specs.length, langs.length);
    const weights = parseWeights(req.weights);

    const resolved = await this.topicResolver.resolve(specs, langs, req.searchLang, req.uiLang);
    this.log(
      `Resolving articles for ${specs.length} topic(s) in ${langs.map((l) => l.code).join(", ")}…`,
    );
    const { topics, notes: articleNotes } = await this.articleResolver.resolve(
      resolved.specs,
      resolved.entities,
      langs,
      req.uiLang,
    );

    const endMonth = lastCompleteMonth(this.clock.today());
    const w = makeWindows(endMonth, req.months, req.window);
    const days = eachDay(w.start, w.end);
    const articles = uniqueArticles(topics, langs);
    this.log(
      `Fetching daily views ${w.start} → ${w.end}: ${articles.size} article(s), ` +
        `${langs.length} edition(s). Cached data is reused.`,
    );
    const traffic = await this.trafficLoader.load(langs, articles, w, endMonth, req.redirects);

    const results = assembleSeries(topics, langs, traffic, days).map((input) =>
      analyzeSeries(input, w),
    );
    const multiTopic = topics.length > 1;
    const multiLang = langs.length > 1;
    const editions: Record<string, EditionContext> = {};
    for (const lang of langs) {
      editions[lang.code] = editionContext(lang, traffic.edition(lang.code), w, days, endMonth);
    }

    return {
      tool: TOOL_NAME,
      version: this.version,
      generated: this.clock.today(),
      command: req.command,
      params: {
        topics: req.topics,
        langs: langs.map((l) => l.code),
        months: w.months.length,
        window: w.window,
        searchLang: req.searchLang,
        redirects: req.redirects,
        weights,
      },
      windows: w,
      notes: [...warnings, ...resolved.notes, ...articleNotes, ...missingArticleNotes(topics)],
      topics,
      editions,
      series: results.map((r) =>
        toSeriesRecord(r, seriesLabel(r.topic, r.lang, multiTopic, multiLang, req.uiLang)),
      ),
      ranking: rankSeries(results, weights),
      verify: this.verificationLinks(topics, langs, w),
    };
  }

  private verificationLinks(
    topics: TopicReport[],
    langs: Lang[],
    w: Windows,
  ): Record<string, string> {
    const verify: Record<string, string> = {};
    for (const lang of langs) {
      const titles = topics
        .flatMap((tr) => tr.articles[lang.code].map((a) => a.title))
        .slice(0, 10);
      if (titles.length)
        verify[lang.code] = this.pageviews.verificationUrl(lang, titles, w.start, w.end);
    }
    return verify;
  }
}

function assertSeriesLimit(topicCount: number, langCount: number): void {
  if (topicCount * langCount <= MAX_SERIES) return;
  throw new InputError(
    `${topicCount} topics × ${langCount} languages = ${topicCount * langCount} series; ` +
      `the limit per run is ${MAX_SERIES}.`,
    "Split the question into several runs (the cache makes repeated runs fast).",
  );
}
