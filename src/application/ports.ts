import type { Lang } from "../domain/languages/language.ts";
import type { Analysis } from "./analysis-model.ts";
import type {
  Access,
  CountryShare,
  Entity,
  PageInfo,
  RedirectStats,
  SearchHit,
  SearchResultPage,
} from "./wiki-types.ts";

export type Log = (message: string) => void;

export interface EntityCatalog {
  search(query: string, lang: string, limit?: number): Promise<SearchHit[]>;
  entities(qids: string[], labelLangs: string[]): Promise<Map<string, Entity>>;
}

export interface ArticleDirectory {
  pageInfo(lang: string, title: string): Promise<PageInfo>;
  redirectViews(lang: string, title: string): Promise<RedirectStats>;
  search(lang: string, query: string, limit?: number): Promise<SearchResultPage[]>;
}

export interface PageviewSource {
  articleDaily(
    lang: Lang,
    title: string,
    access: Access,
    start: string,
    end: string,
  ): Promise<number[]>;
  editionDaily(lang: Lang, access: Access, start: string, end: string): Promise<number[]>;
  uniqueDevices(lang: Lang, firstMonth: string, lastMonth: string): Promise<Record<string, number>>;
  topCountries(lang: Lang, month: string): Promise<CountryShare[]>;
  verificationUrl(lang: Lang, titles: string[], start: string, end: string): string;
}

/** Where analyze results are kept so report (a separate command) can read them. */
export interface AnalysisStore {
  save(runDir: string, analysis: Analysis): void;
  load(runDir: string): Analysis;
}
