import { compactDate } from "../../domain/calendar.ts";
import { InputError } from "../../domain/errors.ts";
import { PAGEVIEWS_REST } from "./endpoints.ts";
import type { IncrementalSeriesCache } from "./incremental-series-cache.ts";

/** Which devices the views came from. */
export type Access = "all-access" | "desktop" | "mobile-web" | "mobile-app";

export class PageviewsApi {
  private readonly series: IncrementalSeriesCache;

  constructor(series: IncrementalSeriesCache) {
    this.series = series;
  }

  articleDaily(
    project: string,
    title: string,
    access: Access,
    start: string,
    end: string,
  ): Promise<number[]> {
    const t = encodeURIComponent(title.replaceAll(" ", "_"));
    return this.series.load(
      `pv|article|${project}|${title}|${access}|user`,
      (a, b) =>
        `${PAGEVIEWS_REST}/pageviews/per-article/${project}/${access}/user/${t}` +
        `/daily/${compactDate(a)}/${compactDate(b)}`,
      start,
      end,
    );
  }

  async editionDaily(
    project: string,
    access: Access,
    start: string,
    end: string,
  ): Promise<number[]> {
    const series = await this.series.load(
      `pv|project|${project}|${access}|user`,
      (a, b) =>
        `${PAGEVIEWS_REST}/pageviews/aggregate/${project}/${access}/user` +
        `/daily/${compactDate(a)}/${compactDate(b)}`,
      start,
      end,
    );
    if (access === "all-access" && series.every((v) => v === 0)) {
      throw new InputError(
        `No pageview data for ${project}. It is probably not a Wikipedia edition.`,
        "Use Wikipedia subdomain codes, e.g. uk, pl, cs, de, en.",
      );
    }
    return series;
  }
}
