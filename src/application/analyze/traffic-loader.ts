import type { Lang } from "../../domain/languages/language.ts";
import type { Windows } from "../../domain/trend/windows.ts";
import type { TopicReport } from "../analysis-model.ts";
import type { ArticleDirectory, PageviewSource } from "../ports.ts";
import type { CountryShare } from "../wiki-types.ts";

export interface EditionTraffic {
  all: number[];
  desktop: number[];
  devices: Record<string, number>; // monthly unique devices of the edition
  countries: CountryShare[]; // where its readers are, one month
}

export interface ArticleTraffic {
  all: number[];
  desktop: number[];
  redirect60: number;
}

/** Daily views of every article and edition in one analysis, downloaded in parallel. */
export class Traffic {
  private readonly editions: Map<string, EditionTraffic>;
  private readonly articles: Map<string, ArticleTraffic>;

  constructor(editions: Map<string, EditionTraffic>, articles: Map<string, ArticleTraffic>) {
    this.editions = editions;
    this.articles = articles;
  }

  edition(lang: string): EditionTraffic {
    return this.editions.get(lang)!;
  }

  article(lang: string, title: string): ArticleTraffic {
    return this.articles.get(articleKey(lang, title))!;
  }
}

const articleKey = (lang: string, title: string) => `${lang}|${title}`;

/** Unique articles of all topics, keyed "lang|title", in topic x language order. */
export function uniqueArticles(
  topics: TopicReport[],
  langs: Lang[],
): Map<string, { lang: Lang; title: string }> {
  const out = new Map<string, { lang: Lang; title: string }>();
  for (const tr of topics) {
    for (const lang of langs) {
      for (const a of tr.articles[lang.code]) {
        out.set(articleKey(lang.code, a.title), { lang, title: a.title });
      }
    }
  }
  return out;
}

export class TrafficLoader {
  private readonly pageviews: PageviewSource;
  private readonly directory: ArticleDirectory;

  constructor(pageviews: PageviewSource, directory: ArticleDirectory) {
    this.pageviews = pageviews;
    this.directory = directory;
  }

  async load(
    langs: Lang[],
    articles: Map<string, { lang: Lang; title: string }>,
    w: Windows,
    endMonth: string,
    withRedirects: boolean,
  ): Promise<Traffic> {
    const editions = new Map<string, EditionTraffic>();
    const perArticle = new Map<string, ArticleTraffic>();
    await Promise.all([
      Promise.all(
        langs.map(async (lang) => {
          const [all, desktop, devices, countries] = await Promise.all([
            this.pageviews.editionDaily(lang, "all-access", w.start, w.end),
            this.pageviews.editionDaily(lang, "desktop", w.start, w.end),
            this.pageviews.uniqueDevices(lang, w.recentMonths[0], endMonth).catch(() => ({})),
            this.pageviews.topCountries(lang, endMonth).catch(() => []),
          ]);
          editions.set(lang.code, { all, desktop, devices, countries });
        }),
      ),
      Promise.all(
        [...articles.entries()].map(async ([key, { lang, title }]) => {
          const [all, desktop, redirects] = await Promise.all([
            this.pageviews.articleDaily(lang, title, "all-access", w.start, w.end),
            this.pageviews.articleDaily(lang, title, "desktop", w.start, w.end),
            withRedirects
              ? this.directory.redirectViews(lang.code, title).catch(() => null)
              : Promise.resolve(null),
          ]);
          perArticle.set(key, { all, desktop, redirect60: redirects?.views60 ?? 0 });
        }),
      ),
    ]);
    return new Traffic(editions, perArticle);
  }
}
