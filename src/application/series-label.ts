import { languageName, type UiLang } from "../domain/languages/display-names.ts";
import type { Analysis } from "./analysis-model.ts";

export function seriesLabel(
  topic: string,
  lang: string,
  multiTopic: boolean,
  multiLang: boolean,
  ui: UiLang,
): string {
  const name = languageName(lang, ui);
  const langLabel = `${name.charAt(0).toUpperCase()}${name.slice(1)} (${lang})`;
  if (multiTopic && multiLang) return `${topic} · ${lang}`;
  if (multiTopic) return topic;
  return langLabel;
}

export function labelIn(a: Analysis, s: { topic: string; lang: string }, ui: UiLang): string {
  return seriesLabel(s.topic, s.lang, a.topics.length > 1, a.params.langs.length > 1, ui);
}
