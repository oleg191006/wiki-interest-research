import type { PageInfo, RedirectStats, SearchResultPage } from "../../application/wiki-types.ts";
import type { CachedJsonClient } from "../http/cached-json-client.ts";
import { actionApiUrl, METADATA_TTL_MS, wikipediaApi } from "./endpoints.ts";

type PageViews = Record<string, number | null>;

const total = (views: PageViews | undefined) =>
  Object.values(views ?? {}).reduce<number>((s, v) => s + (v ?? 0), 0);

export class WikipediaApi {
  private readonly client: CachedJsonClient;

  constructor(client: CachedJsonClient) {
    this.client = client;
  }

  async pageInfo(lang: string, title: string): Promise<PageInfo> {
    const url = actionApiUrl(wikipediaApi(lang), {
      action: "query",
      titles: title,
      redirects: 1,
      prop: "pageprops|revisions|pageviews",
      ppprop: "wikibase_item|disambiguation",
      rvlimit: 1,
      rvdir: "newer",
      rvprop: "timestamp",
      pvipdays: 60,
    });
    const res = await this.client.get(url, {
      key: `page|${lang}|${title}`,
      ttlMs: METADATA_TTL_MS,
    });
    const q = res.data?.query ?? {};
    const page = (q.pages ?? [])[0] ?? {};
    const redirect = (q.redirects ?? [])[0];
    const views = Object.values((page.pageviews ?? {}) as PageViews);
    return {
      lang,
      requested: title,
      title: page.title ?? title,
      exists: !page.missing && !page.invalid && page.pageid !== undefined,
      redirectedFrom: redirect ? redirect.from : undefined,
      qid: page.pageprops?.wikibase_item,
      disambiguation: page.pageprops?.disambiguation !== undefined,
      created: page.revisions?.[0]?.timestamp?.slice(0, 10),
      views60: views.length ? total(page.pageviews) : undefined,
    };
  }

  async redirectViews(lang: string, title: string): Promise<RedirectStats> {
    const url = actionApiUrl(wikipediaApi(lang), {
      action: "query",
      generator: "redirects",
      titles: title,
      grdlimit: 50,
      grdnamespace: 0,
      prop: "pageviews",
      pvipdays: 60,
    });
    const res = await this.client.get(url, {
      key: `redir|${lang}|${title}`,
      ttlMs: METADATA_TTL_MS,
    });
    const pages = (res.data?.query?.pages ?? []) as Array<{
      title: string;
      pageviews?: PageViews;
    }>;
    const rows = pages.map((p) => ({ title: p.title, views60: total(p.pageviews) }));
    rows.sort((a, b) => b.views60 - a.views60);
    return {
      count: rows.length,
      views60: rows.reduce((s, r) => s + r.views60, 0),
      top: rows.slice(0, 3),
    };
  }

  async search(lang: string, query: string, limit = 10): Promise<SearchResultPage[]> {
    type Page = {
      title: string;
      index?: number;
      pageprops?: Record<string, string>;
      pageviews?: PageViews;
    };
    const params = {
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrlimit: limit,
      gsrnamespace: 0,
      prop: "pageprops|pageviews",
      ppprop: "wikibase_item|disambiguation",
      pvipdays: 30,
    };
    const byTitle = new Map<string, Page>();
    let cont: Record<string, string> = {};
    for (let round = 0; round < 6; round++) {
      const url = actionApiUrl(wikipediaApi(lang), { ...params, ...cont });
      const res = await this.client.get(url, {
        key: `search|${lang}|${query}|${limit}|${JSON.stringify(cont)}`,
        ttlMs: METADATA_TTL_MS,
      });
      for (const p of (res.data?.query?.pages ?? []) as Page[]) {
        const prev = byTitle.get(p.title);
        byTitle.set(
          p.title,
          prev ? { ...prev, ...p, pageviews: { ...prev.pageviews, ...p.pageviews } } : p,
        );
      }
      const next = res.data?.continue as Record<string, string> | undefined;
      if (!next || !next.pvipcontinue) break;
      cont = next;
    }
    return [...byTitle.values()]
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((p) => {
        const v = Object.values(p.pageviews ?? {});
        return {
          title: p.title,
          qid: p.pageprops?.wikibase_item,
          disambiguation: p.pageprops?.disambiguation !== undefined,
          viewsPerDay: v.length ? total(p.pageviews) / v.length : undefined,
        };
      });
  }
}
