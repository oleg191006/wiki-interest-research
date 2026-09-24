import { InputError } from "../../domain/errors.ts";
import type { Lang } from "../../domain/languages/language.ts";
import type { EntityCatalog } from "../ports.ts";
import type { Entity } from "../wiki-types.ts";
import { qidsOf, type TopicSpec } from "./topic-spec.ts";

export interface ResolvedTopics {
  specs: TopicSpec[];
  entities: Map<string, Entity>;
  notes: string[];
}

export class TopicResolver {
  private readonly catalog: EntityCatalog;

  constructor(catalog: EntityCatalog) {
    this.catalog = catalog;
  }

  async resolve(
    specs: TopicSpec[],
    langs: Lang[],
    searchLang: string,
    labelLang: string,
  ): Promise<ResolvedTopics> {
    const notes: string[] = [];
    const resolved: TopicSpec[] = [];
    for (const spec of specs) {
      const items = [];
      for (const it of spec.items) {
        items.push(
          it.kind === "query"
            ? {
                kind: "qid" as const,
                qid: await this.resolveQuery(it.text, searchLang, langs, notes),
              }
            : it,
        );
      }
      resolved.push({ ...spec, items });
    }
    const allQids = resolved.flatMap(qidsOf);
    const entities = allQids.length
      ? await this.catalog.entities(allQids, [labelLang, ...langs.map((l) => l.code)])
      : new Map<string, Entity>();
    for (const q of allQids) {
      if (!entities.has(q)) {
        throw new InputError(
          `Wikidata item ${q} does not exist.`,
          "Check the QID with the find command.",
        );
      }
    }
    return { specs: resolved, entities, notes };
  }

  private async resolveQuery(
    text: string,
    searchLang: string,
    langs: Lang[],
    notes: string[],
  ): Promise<string> {
    const hits = await this.catalog.search(text, searchLang, 7);
    if (!hits.length) {
      throw new InputError(
        `Nothing on Wikidata matches "${text}" (${searchLang}).`,
        `Run: find "${text}" --lang <language of the words> to see candidates, then pass a QID.`,
      );
    }
    const ents = await this.catalog.entities(
      hits.map((h) => h.qid),
      [searchLang],
    );
    const score = (qid: string) => {
      const e = ents.get(qid);
      if (!e) return -1;
      const withArticle = langs.filter((l) => e.sitelinks[l.siteId]).length;
      return withArticle * 10 + Math.min(9, Object.keys(e.sitelinks).length / 20);
    };
    const best = [...hits].sort((a, b) => score(b.qid) - score(a.qid))[0];
    if (score(best.qid) <= 0) {
      throw new InputError(
        `"${text}" matched only Wikidata items without Wikipedia articles.`,
        `Run: find "${text}" to choose an item, then pass its QID.`,
      );
    }
    notes.push(
      `Resolved "${text}" → ${best.qid} "${best.label}" (${best.description || "no description"}). ` +
        `If that is not the intended meaning, run find and pass the right QID.`,
    );
    return best.qid;
  }
}
