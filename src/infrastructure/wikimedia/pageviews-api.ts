import type { PageviewSource } from "../../application/ports.ts";
import type { Access, CountryShare } from "../../application/wiki-types.ts";
import { compactDate, monthEnd, monthStart } from "../../domain/calendar.ts";
import { InputError } from "../../domain/errors.ts";
import type { Lang } from "../../domain/languages/language.ts";
import type { CachedJsonClient } from "../http/cached-json-client.ts";
import { PAGEVIEWS_REST, PAGEVIEWS_TOOL } from "./endpoints.ts";
import type { IncrementalSeriesCache } from "./incremental-series-cache.ts";

/** Wikimedia Pageviews REST API: human (agent=user) views only. */
export class PageviewsApi implements PageviewSource {
  private readonly client: CachedJsonClient;
  private readonly series: IncrementalSeriesCache;

  constructor(client: CachedJsonClient, series: IncrementalSeriesCache) {
    this.client = client;
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

  async uniqueDevices(
    lang: Lang,
    firstMonth: string,
    lastMonth: string,
  ): Promise<Record<string, number>> {
    const url =
      `${PAGEVIEWS_REST}/unique-devices/${lang.project}/all-sites/monthly` +
      `/${compactDate(monthStart(firstMonth))}/${compactDate(monthEnd(lastMonth))}`;
    const res = await this.client.get(url, {
      key: `ud|${lang.project}|${firstMonth}|${lastMonth}`,
      ttlMs: null,
    });
    const out: Record<string, number> = {};
    const items = (res.data?.items ?? []) as Array<{ timestamp: string; devices: number }>;
    for (const item of items) {
      out[`${item.timestamp.slice(0, 4)}-${item.timestamp.slice(4, 6)}`] = item.devices;
    }
    return out;
  }

  async topCountries(lang: Lang, month: string): Promise<CountryShare[]> {
    const [y, m] = month.split("-");
    const project = lang.project.replace(/\.org$/, "");
    const url = `${PAGEVIEWS_REST}/pageviews/top-by-country/${project}/all-access/${y}/${m}`;
    const res = await this.client.get(url, {
      key: `country|${lang.project}|${month}`,
      ttlMs: null,
    });
    const raw = (res.data?.items?.[0]?.countries ?? []) as Array<{
      country: string;
      views_ceil?: number;
    }>;
    const rows = raw.filter((r) => r.views_ceil);
    const total = rows.reduce((s, r) => s + (r.views_ceil ?? 0), 0);
    if (!total) return [];
    return rows
      .map((r) => ({ country: r.country, share: (r.views_ceil ?? 0) / total }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 5);
  }

  verificationUrl(lang: Lang, titles: string[], start: string, end: string): string {
    const qs = new URLSearchParams({
      project: lang.project,
      platform: "all-access",
      agent: "user",
      redirects: "0",
      start,
      end,
      pages: titles.join("|"),
    });
    return `${PAGEVIEWS_TOOL}?${qs.toString()}`;
  }
}
