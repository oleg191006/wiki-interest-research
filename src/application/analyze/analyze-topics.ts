import { eachDay, lastCompleteMonth } from "../../domain/calendar.ts";
import type { Clock } from "../../domain/clock.ts";
import { InputError } from "../../domain/errors.ts";
import type { UiLang } from "../../domain/languages/display-names.ts";
import { parseLangs } from "../../domain/languages/language.ts";
import { analyzeSeries } from "../../domain/trend/analyze-series.ts";
import { makeWindows } from "../../domain/trend/windows.ts";
import { toSeriesRecord, type Analysis } from "../analysis-model.ts";
import type { ArticleDirectory, EntityCatalog, Log, PageviewSource } from "../ports.ts";
import { seriesLabel } from "../series-label.ts";
import { ArticleResolver, missingArticleNotes } from "./article-resolver.ts";
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
  private readonly clock: Clock;
  private readonly version: string;
  private readonly log: Log;

  constructor(deps: AnalyzeDependencies) {
    this.topicResolver = new TopicResolver(deps.catalog);
    this.articleResolver = new ArticleResolver(deps.directory);
    this.trafficLoader = new TrafficLoader(deps.pageviews, deps.directory);
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

    const w = makeWindows(lastCompleteMonth(this.clock.today()), req.months, req.window);
    const days = eachDay(w.start, w.end);
    const articles = uniqueArticles(topics, langs);
    this.log(
      `Fetching daily views ${w.start} → ${w.end}: ${articles.size} article(s), ` +
        `${langs.length} edition(s). Cached data is reused.`,
    );
    const traffic = await this.trafficLoader.load(langs, articles, w, req.redirects);

    const results = assembleSeries(topics, langs, traffic, days).map((input) =>
      analyzeSeries(input, w),
    );
    const multiTopic = topics.length > 1;
    const multiLang = langs.length > 1;

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
      },
      windows: w,
      notes: [...warnings, ...resolved.notes, ...articleNotes, ...missingArticleNotes(topics)],
      topics,
      series: results.map((r) =>
        toSeriesRecord(r, seriesLabel(r.topic, r.lang, multiTopic, multiLang, req.uiLang)),
      ),
    };
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
