import type { Settings } from "../settings.ts";

export function usage(s: Settings): string {
  return `wiki-interest-research ${s.version}: public interest in topics from Wikipedia pageviews

Usage: ${s.launcher} <command> [options]

  find "<topic>"      Which Wikidata item a topic is, and its article in each edition.
    --lang <codes>      Comma-separated Wikipedia editions, e.g. uk,pl,cs.
    --limit <n>         How many Wikidata matches to show, default 5.

  analyze             Year-over-year change of one or more topics.
    --topic <spec>      Repeatable. "Name=Q333,Q544", "pl:Article title" or free text.
    --langs <codes>     Comma-separated Wikipedia editions, e.g. uk,pl,cs.
    --out <dir>         Output folder, default wiki-interest-output/<topics>_<langs>.
    --months <n>        Months shown, default 24.
    --window <n>        Months compared with a year earlier, 3-12, default 12.
    --weights <spec>    Ranking weights, e.g. growth=0.5,volume=0.3,share=0.2.
    --search-lang <c>   Language of free-text topics, default en.
    --no-redirects      Skip the redirect check (one request less per article).
    --ui-lang <en|uk>   Language of labels, default en.

  doctor              Check Node, dependencies, the cache folder and the Wikimedia connection.
  cache [--clear]     Show the size of the download cache, or empty it.

Global switches:
  --offline           Use cached data only; fail instead of downloading.
  --refresh           Ignore the cache and download again.

Commands still being built: related, report.`;
}
