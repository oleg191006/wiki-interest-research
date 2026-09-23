import type { Settings } from "../settings.ts";

export function usage(s: Settings): string {
  return `wiki-interest-research ${s.version}: public interest in topics from Wikipedia pageviews

Usage: ${s.launcher} <command> [options]

  analyze             Year-over-year change of one article's pageviews.
    --article <title>   Wikipedia article title, e.g. "Астрономія".
    --lang <code>       Wikipedia edition, default uk.
    --months <n>        Months shown, default 24.
    --window <n>        Months compared with a year earlier, 3-12, default 12.

  doctor              Check Node, dependencies, the cache folder and the Wikimedia connection.
  cache [--clear]     Show the size of the download cache, or empty it.

Global switches:
  --offline           Use cached data only; fail instead of downloading.
  --refresh           Ignore the cache and download again.

Commands still being built: find, related, report.`;
}
