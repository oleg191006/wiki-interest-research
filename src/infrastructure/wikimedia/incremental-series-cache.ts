import { addDays, compactDate, eachDay, fromApiTimestamp } from "../../domain/calendar.ts";
import type { Clock } from "../../domain/clock.ts";
import { SourceError } from "../../domain/errors.ts";
import type { KeyValueStore } from "../cache/file-cache.ts";
import type { CacheMode } from "../http/cached-json-client.ts";
import type { JsonTransport, RequestStats } from "../http/fetch-transport.ts";
import { PAGEVIEWS_START, STABLE_AFTER_DAYS } from "./endpoints.ts";

interface StoredSeries {
  from: string;
  to: string;
  stableTo: string;
  data: Record<string, number>;
}

type DailyItems = { items: Array<{ timestamp: string; views: number }> };

export interface SeriesDeps {
  transport: JsonTransport;
  store: KeyValueStore;
  mode: CacheMode;
  stats: RequestStats;
  clock: Clock;
}

/**
 * A daily series cached under one logical key and extended incrementally: a later question
 * with a longer period downloads only the missing days (and re-checks the last few, which
 * Wikimedia may still update).
 */
export class IncrementalSeriesCache {
  private readonly deps: SeriesDeps;

  constructor(deps: SeriesDeps) {
    this.deps = deps;
  }

  async load(
    key: string,
    urlFor: (start: string, end: string) => string,
    start: string,
    end: string,
  ): Promise<number[]> {
    const { store, mode, stats, clock } = this.deps;
    const from = start < PAGEVIEWS_START ? PAGEVIEWS_START : start;
    const hit = mode.refresh ? null : store.get<StoredSeries>(key);
    const stored: StoredSeries = hit?.value ?? {
      from,
      to: addDays(from, -1),
      stableTo: addDays(from, -1),
      data: {},
    };
    const gaps = hit ? missingRanges(stored, from, end) : [[from, end] as [string, string]];

    if (gaps.length) {
      if (mode.offline) {
        throw new SourceError(
          `Offline mode: ${key} is not cached for ${start}..${end}.`,
          "Run without --offline.",
        );
      }
      for (const [a, b] of gaps) await this.download(stored, urlFor(a, b), a, b);
      stored.from = from < stored.from || !hit ? from : stored.from;
      stored.to = end > stored.to ? end : stored.to;
      const stableLimit = addDays(clock.today(), -STABLE_AFTER_DAYS);
      stored.stableTo = stored.to < stableLimit ? stored.to : stableLimit;
      store.set(key, stored);
    } else {
      stats.cacheHits++;
    }
    return eachDay(start, end).map((d) =>
      d < PAGEVIEWS_START ? 0 : (stored.data[compactDate(d)] ?? 0),
    );
  }

  private async download(stored: StoredSeries, url: string, a: string, b: string): Promise<void> {
    const res = await this.deps.transport.fetchJson<DailyItems>(url);
    for (const d of eachDay(a, b)) delete stored.data[compactDate(d)];
    for (const item of res.data?.items ?? []) {
      const d = fromApiTimestamp(item.timestamp);
      if (d >= a && d <= b) stored.data[compactDate(d)] = item.views;
    }
  }
}

/** Ranges not covered by the cached series: earlier days, and days that were not final yet. */
function missingRanges(stored: StoredSeries, from: string, end: string): Array<[string, string]> {
  const gaps: Array<[string, string]> = [];
  if (from < stored.from) gaps.push([from, addDays(stored.from, -1)]);
  if (end > stored.stableTo) {
    const next = addDays(stored.stableTo, 1);
    gaps.push([next < stored.from ? stored.from : next, end]);
  }
  return gaps;
}
