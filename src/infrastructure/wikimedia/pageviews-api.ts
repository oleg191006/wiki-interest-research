import { compactDate } from "../../domain/calendar.ts";
import { InputError } from "../../domain/errors.ts";
import type { Lang } from "../../domain/languages/language.ts";
import { PAGEVIEWS_REST } from "./endpoints.ts";
import type { IncrementalSeriesCache } from "./incremental-series-cache.ts";

/** Which devices the views came from. */
export type Access = "all-access" | "desktop" | "mobile-web" | "mobile-app";

/** Wikimedia Pageviews REST API: human (agent=user) views only. */
export class PageviewsApi {
  private readonly series: IncrementalSeriesCache;

  constructor(series: IncrementalSeriesCache) {
    this.series = series;
  }

  /** Daily views of one article, aligned with eachDay(start, end). */
  articleDaily(
    lang: Lang,
    title: string,
    access: Access,
    start: string,
    end: string,
  ): Promise<number[]> {
    const t = encodeURIComponent(title.replaceAll(" ", "_"));
    return this.series.load(
      `pv|article|${lang.project}|${title}|${access}|user`,
      (a, b) =>
        `${PAGEVIEWS_REST}/pageviews/per-article/${lang.project}/${access}/user/${t}` +
        `/daily/${compactDate(a)}/${compactDate(b)}`,
      start,
      end,
    );
  }

  /** Daily views of a whole language edition: the background every article is compared against. */
  async editionDaily(lang: Lang, access: Access, start: string, end: string): Promise<number[]> {
    const series = await this.series.load(
      `pv|project|${lang.project}|${access}|user`,
      (a, b) =>
        `${PAGEVIEWS_REST}/pageviews/aggregate/${lang.project}/${access}/user` +
        `/daily/${compactDate(a)}/${compactDate(b)}`,
      start,
      end,
    );
    if (access === "all-access" && series.every((v) => v === 0)) {
      throw new InputError(
        `No pageview data for ${lang.project}. The language code "${lang.code}" is probably ` +
          `not a Wikipedia edition.`,
        "Use Wikipedia subdomain codes, e.g. uk, pl, cs, de, en.",
      );
    }
    return series;
  }
}
