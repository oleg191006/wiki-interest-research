// Wikimedia endpoints and the facts about them the clients rely on.

export const PAGEVIEWS_REST = "https://wikimedia.org/api/rest_v1/metrics";
export const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
export const PAGEVIEWS_TOOL = "https://pageviews.wmcloud.org/";

// Pageview data (with the user/spider split) starts on this date.
export const PAGEVIEWS_START = "2015-07-01";

// Historical daily pageviews never change once they are a few days old, so those are cached
// forever; metadata (titles, sitelinks, redirects) can change, so it expires.
export const STABLE_AFTER_DAYS = 3;
export const METADATA_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function wikipediaApi(lang: string): string {
  return `https://${lang}.wikipedia.org/w/api.php`;
}

/** MediaWiki Action API URL with JSON format v2. */
export function actionApiUrl(base: string, params: Record<string, string | number>): string {
  const entries = Object.entries(params).map(([k, v]) => [k, String(v)]);
  const qs = new URLSearchParams({
    format: "json",
    formatversion: "2",
    ...Object.fromEntries(entries),
  });
  return `${base}?${qs.toString()}`;
}
