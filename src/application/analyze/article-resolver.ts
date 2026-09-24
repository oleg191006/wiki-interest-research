import type { UiLang } from "../../domain/languages/display-names.ts";
import type { Lang } from "../../domain/languages/language.ts";
import type { TopicReport } from "../analysis-model.ts";
import type { ArticleDirectory } from "../ports.ts";
import { entityLabel, type Entity } from "../wiki-types.ts";
import { qidsOf, type TopicItem, type TopicSpec } from "./topic-spec.ts";

interface Lookup {
  topic: TopicReport;
  lang: Lang;
  qid?: string;
  title: string;
}

export class ArticleResolver {
  private readonly directory: ArticleDirectory;

  constructor(directory: ArticleDirectory) {
    this.directory = directory;
  }

  async resolve(
    specs: TopicSpec[],
    entities: Map<string, Entity>,
    langs: Lang[],
    ui: UiLang,
  ): Promise<{ topics: TopicReport[]; notes: string[] }> {
    const topics: TopicReport[] = [];
    const lookups: Lookup[] = [];
    for (const spec of specs) {
      const topic: TopicReport = {
        name: topicName(spec, entities, ui),
        qids: qidsOf(spec),
        articles: {},
        missing: {},
      };
      topics.push(topic);
      for (const lang of langs) {
        topic.articles[lang.code] = [];
        topic.missing[lang.code] = [];
        for (const it of spec.items) this.plan(it, topic, lang, entities, lookups);
      }
    }
    const infos = await Promise.all(
      lookups.map((l) => this.directory.pageInfo(l.lang.code, l.title)),
    );
    const notes: string[] = [];
    lookups.forEach((l, i) => {
      const info = infos[i];
      if (!info.exists) {
        l.topic.missing[l.lang.code].push(`"${l.title}" (page not found)`);
        return;
      }
      if (info.disambiguation) {
        notes.push(
          `${l.lang.code}: "${info.title}" is a disambiguation page, not a topic article. ` +
            `Pick a specific article with find.`,
        );
      }
      if (info.redirectedFrom) {
        notes.push(
          `${l.lang.code}: "${info.redirectedFrom}" redirects to "${info.title}"; using "${info.title}".`,
        );
      }
      const list = l.topic.articles[l.lang.code];
      if (list.some((a) => a.title === info.title)) return;
      list.push({
        qid: l.qid ?? info.qid,
        title: info.title,
        requested: l.title,
        exists: true,
        redirectedFrom: info.redirectedFrom,
        disambiguation: info.disambiguation,
        created: info.created,
        views60: info.views60,
      });
    });
    return { topics, notes };
  }

  private plan(
    it: TopicItem,
    topic: TopicReport,
    lang: Lang,
    entities: Map<string, Entity>,
    lookups: Lookup[],
  ): void {
    if (it.kind === "qid") {
      const title = entities.get(it.qid)?.sitelinks[lang.siteId];
      if (title) lookups.push({ topic, lang, qid: it.qid, title });
      else topic.missing[lang.code].push(`${it.qid} "${entityLabel(entities.get(it.qid), "en")}"`);
    } else if (it.kind === "title" && it.lang === lang.code) {
      lookups.push({ topic, lang, title: it.title });
    }
  }
}

function topicName(spec: TopicSpec, entities: Map<string, Entity>, ui: UiLang): string {
  const firstQid = spec.items.find(
    (it): it is Extract<TopicItem, { kind: "qid" }> => it.kind === "qid",
  );
  const firstTitle = spec.items.find(
    (it): it is Extract<TopicItem, { kind: "title" }> => it.kind === "title",
  );
  return (
    spec.name ||
    (firstQid ? entityLabel(entities.get(firstQid.qid), ui) : (firstTitle?.title ?? "topic"))
  );
}

export function missingArticleNotes(topics: TopicReport[]): string[] {
  const notes: string[] = [];
  for (const tr of topics) {
    for (const [code, miss] of Object.entries(tr.missing)) {
      if (miss.length && !tr.articles[code].length) {
        notes.push(
          `${code}: no article for "${tr.name}" (${miss.join(", ")}); ` +
            `this topic cannot be measured in ${code}.`,
        );
      } else if (miss.length) {
        notes.push(
          `${code}: "${tr.name}" is measured without ${miss.join(", ")} (no article), ` +
            `so it is not like-for-like with other languages.`,
        );
      }
    }
  }
  return notes;
}
