import { languageName, type UiLang } from "../domain/languages/display-names.ts";

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
