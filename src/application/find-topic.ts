import type { Lang } from "../domain/languages/language.ts";
import type { ArticleDirectory, EntityCatalog } from "./ports.ts";
import { entityLabel, wikipediaCount, type SearchResultPage } from "./wiki-types.ts";

export interface FindRequest {
  query: string;
  searchLang: string;
  langs: Lang[];
  limit: number;
}

export interface Candidate {
  qid: string;
  label: string;
  description: string;
  wikipedias: number;
  titles: Record<string, string | undefined>;
}

export interface KeywordMatch {
  lang: string;
  term: string;
  pages: SearchResultPage[];
}

export interface FindResult {
  request: FindRequest;
  matches: number;
  candidates: Candidate[];
  hidden: number;
  best?: { qid: string; label: string; missing: string[]; keywordMatches: KeywordMatch[] };
}

export class FindTopic {
  private readonly catalog: EntityCatalog;
  private readonly directory: ArticleDirectory;

  constructor(catalog: EntityCatalog, directory: ArticleDirectory) {
    this.catalog = catalog;
    this.directory = directory;
  }

  async execute(req: FindRequest): Promise<FindResult> {
    const hits = await this.catalog.search(req.query, req.searchLang, Math.min(10, req.limit));
    const result: FindResult = { request: req, matches: hits.length, candidates: [], hidden: 0 };
    if (!hits.length) return result;
    const ents = await this.catalog.entities(
      hits.map((h) => h.qid),
      [req.searchLang, ...req.langs.map((l) => l.code)],
    );
    for (const h of hits) {
      const e = ents.get(h.qid);
      const wikipedias = e ? wikipediaCount(e) : 0;
      const inRequested = e ? req.langs.filter((l) => e.sitelinks[l.siteId]).length : 0;

      if (!wikipedias || (req.langs.length && !inRequested && result.candidates.length > 0)) {
        result.hidden++;
        continue;
      }
      const titles = Object.fromEntries(req.langs.map((l) => [l.code, e!.sitelinks[l.siteId]]));
      result.candidates.push({
        qid: h.qid,
        label: h.label,
        description: h.description,
        wikipedias,
        titles,
      });
    }
    const top = result.candidates[0];
    if (!top) return result;
    const e = ents.get(top.qid)!;
    const missing = req.langs.filter((l) => !e.sitelinks[l.siteId]);
    const keywordMatches: KeywordMatch[] = [];
    for (const l of missing) {
      const term = e.labels[l.code] ?? req.query;
      keywordMatches.push({
        lang: l.code,
        term,
        pages: await this.directory.search(l.code, term, 3).catch(() => []),
      });
    }
    result.best = {
      qid: top.qid,
      label: entityLabel(e, "en"),
      missing: missing.map((l) => l.code),
      keywordMatches,
    };
    return result;
  }
}
