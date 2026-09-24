export const EN = {
  "verdict.rising": "rising",
  "verdict.falling": "falling",
  "verdict.flat": "stable",
  "verdict.unclear": "unclear",
  "verdict.insufficient": "no data",
  "conf.high": "high confidence",
  "conf.medium": "medium confidence",
  "conf.low": "low confidence",
  "conf.short.high": "high",
  "conf.short.medium": "medium",
  "conf.short.low": "low",

  "flag.very_low_volume":
    "Very low volume (median views per day: {median}), so a handful of readers can move the numbers.",
  "flag.low_volume": "Low volume (median views per day: {median}), so treat percentages as rough.",
  "flag.ci_includes_zero": "The 95% interval ({low}%…{high}%) includes zero: no reliable change.",
  "flag.inconsistent_months": "Only {agree} of {n} months moved in that direction.",
  "flag.spike_driven":
    "Driven by spikes: {growth}% overall but {despiked}% with spike days capped.",
  "flag.spikes_present": "Spike days in the recent period: {count} ({share}% of its views).",
  "flag.bot_suspected":
    "Possible automated traffic: desktop share {deskBase}% → {deskRecent}% while the whole edition went {projBase}% → {projRecent}%.",
  "flag.article_new":
    "Article created during the comparison period ({titles}, {created}): growth is inflated.",
  "flag.abrupt_start":
    "Views start abruptly in {month} (new or renamed article?): growth is not comparable.",
  "flag.platform_opposite":
    "The whole edition changed {project}%; relative to it the topic changed {normalized}%, so the raw trend mostly reflects the platform.",
  "flag.platform_context": "Whole edition {project}% YoY; topic relative to it {normalized}%.",
  "flag.redirect_share": "{share}% of recent views land on redirects (not in the main numbers).",
  "flag.seasonal": "Seasonal peaks: {peaks} (up to +{top}% above average).",
  "flag.no_baseline": "No views in the baseline period, so growth cannot be computed.",

  "report.title": "Interest in {topics}",
  "report.subtitle": "Wikipedia pageviews · {langs} · {period}",
  "report.question": "Question",
  "report.answer": "Answer",
  "report.metrics": "Key metrics",
  "report.recommendations": "Recommendations",
  "report.nextSteps": "Suggested next steps",
  "report.trust": "How much to trust this",
  "report.limits": "Assumptions and limitations",
  "report.method": "Method and sources",
  "report.noIssues": "Automatic checks found no issues.",
  "unit.yoy": "YoY",
  "report.chartTrend": "Monthly views, index (baseline period = 100)",
  "report.chartGrowth": "Year-over-year growth with 95% interval",
  "report.chartDaily": "Daily views, 29-day median and spike days",
  "col.series": "Topic · edition",
  "col.avg": "Views / month",
  "col.growth": "YoY growth [95% CI]",
  "col.despiked": "Excl. spikes",
  "col.normalized": "vs whole edition",
  "col.months": "Months up",
  "col.verdict": "Verdict",
  "legend.raw": "YoY growth (95% interval)",
  "legend.norm": "Relative to the whole edition",
  "legend.edition": "Whole {lang} Wikipedia",
  "legend.recent": "Recent period",
  "legend.spike": "Spike day",
  "legend.median": "29-day median",
  "legend.daily": "Daily views",
  "limit.intent":
    "Pageviews measure curiosity, not purchase intent: use them to choose what to test next, not as proof of demand.",
  "limit.country": "A language edition is not a country. Readers by country: {countries}.",
  "limit.countryHidden":
    "{lang}: country data omits {country} (Wikimedia privacy protection), so shares are incomplete",
  "limit.human":
    "Only human traffic (agent=user) is counted; Wikimedia's bot filter is imperfect, so anomalies are checked above.",
  "limit.titles":
    "Counts cover the listed articles' current titles; redirects and other articles on the topic are not included.",
  "limit.platform":
    "Overall Wikipedia traffic is shifting (AI answers, search changes); the 'vs whole edition' column corrects for that.",
  "limit.missing":
    "Missing articles: {items}. Those languages are measured on a smaller set of articles.",
  "method.text":
    "Data: Wikimedia Pageviews API, daily human views, all platforms. Growth = {recent} vs the same months a year earlier ({baseline}). 95% interval: paired bootstrap over months (5,000 resamples). Spike day: above 3x the 29-day median. Relative growth divides by the edition's total views. Generated {date} by wiki-interest-research {version}.",
  "method.articles": "Articles",
  "method.verify": "Verify",
  "auto.next.validate":
    "Validate the strongest signal with a second source (search trends, app-store keywords) before investing.",
  "auto.next.test": "Run a cheap demand test (landing page or ad) in the top-ranked language.",
  "auto.next.basket":
    "Broaden the topic to 4-8 related articles to see whether the trend holds beyond one page.",
};

export type MessageKey = keyof typeof EN;
