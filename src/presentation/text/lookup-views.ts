import type { FindResult } from "../../application/find-topic.ts";
import type { RelatedResult } from "../../application/related-articles.ts";
import { quoteArg } from "./command-line.ts";

const titleOrDash = (lang: string, title: string | undefined, missing: string) =>
  `${lang}: ${title ? `"${title}"` : missing}`;

export class LookupViews {
  private readonly launcher: string;

  constructor(launcher: string) {
    this.launcher = launcher;
  }

  find(r: FindResult): string {
    const { query, searchLang, langs } = r.request;
    if (!r.matches) {
      return `No Wikidata items match "${query}" in ${searchLang}. Try English words (--search-lang en) or the topic's name in another language.`;
    }
    const lines = [`Wikidata candidates for "${query}" (search language: ${searchLang}):`];
    r.candidates.forEach((c, i) => {
      lines.push(
        `${i + 1}. ${c.qid} — ${c.label}: ${c.description || "(no description)"} [${c.wikipedias} Wikipedias]`,
      );
      if (langs.length)
        lines.push(
          `   ${langs.map((l) => titleOrDash(l.code, c.titles[l.code], "— no article")).join(" | ")}`,
        );
    });
    if (r.hidden)
      lines.push(
        `(${r.hidden} more item(s) hidden: no article in ${langs.length ? "the requested languages" : "any Wikipedia"}, e.g. books, papers, films)`,
      );
    const best = r.best;
    if (!best) return lines.join("\n");
    if (best.missing.length) {
      lines.push(
        "",
        `${best.qid} has no article in: ${best.missing.join(", ")}. Keyword search there (NOT verified equivalents; use only if clearly the same topic):`,
      );
      for (const m of best.keywordMatches) {
        const found = m.pages
          .filter((p) => !p.disambiguation)
          .map((p) => `"${p.title}"${p.qid ? ` ${p.qid}` : ""}`);
        lines.push(`   ${m.lang} (searched "${m.term}"): ${found.join(", ") || "nothing"}`);
      }
    }
    lines.push(
      "",
      `Pick the candidate whose description matches the user's meaning (usually #1). Next:`,
      `${this.launcher} analyze --topic ${quoteArg(`${best.label}=${best.qid}`)} --langs ${langs.map((l) => l.code).join(",") || "<codes>"}`,
    );
    return lines.join("\n");
  }

  related(r: RelatedResult): string {
    const { qid, sourceLang, langs } = r.request;
    const lines = [
      `Articles related to ${qid} "${r.label}" (similar-text search on ${sourceLang}.wikipedia "${r.sourceTitle}"):`,
    ];
    for (const item of r.items) {
      const avail = langs.map((l) => titleOrDash(l.code, item.titles[l.code], "—")).join(" | ");
      const pop =
        item.viewsPerDay !== undefined
          ? ` (~${Math.round(item.viewsPerDay).toLocaleString("en-US")} views/day on ${sourceLang})`
          : "";
      lines.push(`- ${item.qid} ${item.label}${pop}${avail ? ` → ${avail}` : ""}`);
    }
    lines.push(
      "",
      "Choose 3-7 central items a learner of this topic would look up (prefer well-read pages; skip people, places, single objects and niche pages), then:",
      `${this.launcher} analyze --topic ${quoteArg(`${r.label}=${qid},<QID>,<QID>`)} --langs ${langs.map((l) => l.code).join(",") || "<codes>"}`,
    );
    return lines.join("\n");
  }
}
