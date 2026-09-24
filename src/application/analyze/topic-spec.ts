import { InputError } from "../../domain/errors.ts";
import { normalizeLang } from "../../domain/languages/language.ts";

export const MAX_ITEMS_PER_TOPIC = 10;

export type TopicItem =
  | { kind: "qid"; qid: string }
  | { kind: "title"; lang: string; title: string }
  | { kind: "query"; text: string };

export interface TopicSpec {
  name: string;
  items: TopicItem[];
}

export function parseTopic(spec: string): TopicSpec {
  const eq = spec.indexOf("=");
  const name = eq > 0 ? spec.slice(0, eq).trim() : "";
  const rest = (eq > 0 ? spec.slice(eq + 1) : spec).trim();
  if (!rest) {
    throw new InputError(
      `Empty --topic "${spec}".`,
      'Use --topic "Name=Q123" or --topic "Name=Q1,Q2,pl:Article title".',
    );
  }
  const parts = rest
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const structured = parts.every((p) => /^Q\d+$/i.test(p) || /^[a-z-]{2,12}:.+/.test(p));
  const items: TopicItem[] = structured ? parts.map(parseItem) : [{ kind: "query", text: rest }];
  if (items.length > MAX_ITEMS_PER_TOPIC) {
    throw new InputError(
      `Topic "${name || rest}" has ${items.length} items; the limit is ${MAX_ITEMS_PER_TOPIC}.`,
      "Keep 1-8 core articles per topic.",
    );
  }
  return { name, items };
}

function parseItem(p: string): TopicItem {
  if (/^Q\d+$/i.test(p)) return { kind: "qid", qid: p.toUpperCase() };
  const colon = p.indexOf(":");
  return {
    kind: "title",
    lang: normalizeLang(p.slice(0, colon)),
    title: p.slice(colon + 1).trim(),
  };
}

export function qidsOf(spec: TopicSpec): string[] {
  return spec.items.flatMap((it) => (it.kind === "qid" ? [it.qid] : []));
}
