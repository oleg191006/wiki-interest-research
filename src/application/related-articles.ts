import { InputError } from "../domain/errors.ts";
import { toLang, type Lang } from "../domain/languages/language.ts";
import type { ArticleDirectory, EntityCatalog } from "./ports.ts";
import { entityLabel } from "./wiki-types.ts";

export interface RelatedRequest {
  qid: string;
  sourceLang: string;
  langs: Lang[];
  limit: number;
}

export interface RelatedItem {
  qid: string;
  label: string;
  viewsPerDay?: number;
  titles: Record<string, string | undefined>;
}

export interface RelatedResult {
  request: RelatedRequest;
  label: string;
  sourceTitle: string;
  items: RelatedItem[];
}

const NAVIGATION_PAGE = /^(outline|glossary|list|lists|timeline|index|bibliography) of /i;

export class RelatedArticles {
  private readonly catalog: EntityCatalog;
  private readonly directory: ArticleDirectory;

  constructor(catalog: EntityCatalog, directory: ArticleDirectory) {
    this.catalog = catalog;
    this.directory = directory;
  }

  async execute(req: RelatedRequest): Promise<RelatedResult> {
    const base = (await this.catalog.entities([req.qid], [req.sourceLang])).get(req.qid);
    const sourceTitle = base?.sitelinks[toLang(req.sourceLang).siteId];
    if (!base || !sourceTitle)
      throw new InputError(
        `${req.qid} has no article in ${req.sourceLang}.wikipedia.`,
        "Use --lang with a language that has the article (usually en).",
      );
    const limit = Math.min(20, req.limit);
    const pages = (
      await this.directory.search(
        req.sourceLang,
        `morelike:${sourceTitle}`,
        Math.min(20, req.limit + 4),
      )
    )
      .filter(
        (r) => r.qid && !r.disambiguation && r.qid !== req.qid && !NAVIGATION_PAGE.test(r.title),
      )
      .slice(0, limit);
    const ents = await this.catalog.entities(
      pages.map((r) => r.qid!),
      ["en", ...req.langs.map((l) => l.code)],
    );
    const items = pages.map((r) => {
      const e = ents.get(r.qid!);
      return {
        qid: r.qid!,
        label: entityLabel(e, "en"),
        viewsPerDay: r.viewsPerDay,
        titles: Object.fromEntries(req.langs.map((l) => [l.code, e?.sitelinks[l.siteId]])),
      };
    });
    return { request: req, label: entityLabel(base, "en"), sourceTitle, items };
  }
}
