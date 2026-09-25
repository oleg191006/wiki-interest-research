# Methodology

How every number in `summary.md`, `analysis.json` and the PDF is produced, and why.
Source of truth: `src/domain/trend/` (windows, growth, spikes, seasonality, verdict, checks/),
`src/domain/ranking/`, `src/infrastructure/wikimedia/pageviews-api.ts`.

## Contents
1. Data
2. Periods
3. Growth metrics
4. Trust checks
5. Verdict and confidence
6. Ranking
7. Caching and API etiquette

## 1. Data

| What | Endpoint | Notes |
|---|---|---|
| Article views | `/metrics/pageviews/per-article/{project}/{access}/user/{title}/daily/...` | `agent=user` = human traffic; `all-access` plus `desktop` (for the bot check) |
| Edition totals | `/metrics/pageviews/aggregate/{project}/{access}/user/daily/...` | denominator for "vs whole edition" |
| Audience size | `/metrics/unique-devices/{project}/all-sites/monthly/...` | monthly unique devices, context only |
| Reader countries | `/metrics/pageviews/top-by-country/{project}/all-access/{y}/{m}` | privacy-bucketed; some countries are hidden |
| Titles across languages | Wikidata `wbsearchentities`, `wbgetentities` (sitelinks) | the same concept in every language |
| Page facts | MediaWiki `prop=pageprops|revisions|pageviews`, `generator=redirects` | canonical title, disambiguation flag, creation date, redirect traffic |

Views are counted for the article's **current canonical title**. Redirect traffic is measured
separately (last 60 days) and reported when it exceeds 10%.

## 2. Periods

- Only **complete months** are used (a month counts once its last day is 2+ days old).
- **Recent period** = the last `window` months (default 12). **Baseline** = the same calendar
  months one year earlier. Comparing like months cancels seasonality (September school peaks,
  January resolutions) without any seasonal model.
- Charts show `--months` (default 24, at least `12 + window`).

## 3. Growth metrics

| Metric | Definition | Why |
|---|---|---|
| YoY growth | sum(recent) / sum(baseline) − 1 | the headline change |
| 95% interval | paired bootstrap: resample the 12 month-pairs (recent month, same month a year earlier) 5,000 times, recompute growth, take the 2.5th and 97.5th percentiles; seeded, so reproducible | wide when growth comes from a few months, narrow when it is broad-based |
| Excl. spikes | growth after capping each spike day at its threshold (see 4) | shows whether a few days drive the change |
| Months up | how many month-pairs increased; sign test p-value in `analysis.json` | consistency; 10/12 by chance has p ≈ 0.04 |
| vs whole edition | (1 + growth) / (1 + edition growth) − 1, with its own bootstrap interval | removes platform-wide traffic changes (AI answers, search changes, bot reclassification) |
| Views per million | topic views / edition views × 10^6 | comparable prominence across editions of different size |
| Median day growth | median daily views recent vs baseline (`growthMedianDay`) | another spike-proof view |

## 4. Trust checks (flags)

| Flag | Rule | Effect on confidence |
|---|---|---|
| very_low_volume | median human views per day < 10 in the recent period | −2 |
| low_volume | median < 50 | −1 |
| inconsistent_months | fewer than 2/3 of month-pairs move in the verdict's direction | −1 |
| spike_driven | growth excluding spikes has the other sign or is less than half of raw growth | −1 |
| platform_opposite | relative-to-edition growth has the opposite sign of raw growth | −1 |
| bot_suspected | desktop share shifts ≥ 15 points more than the edition's own shift (and ≥ 50% desktop), or desktop-only spikes (≥ 85% desktop) hold ≥ 5% of recent views on a mostly-mobile article | −1 |
| article_new | an article in the basket was created during the comparison periods | −2 |
| abrupt_start | views jump from ~0 inside the comparison periods (typical after a rename) | −2 |
| ci_includes_zero | verdict `unclear` | confidence = low |
| spikes_present, platform_context, redirect_share, seasonal | informational | none |

**Spike day**: views above max(3 × local median, median + 5·√median) and at least 20 views,
where the local median is a centered 29-day rolling median. The √ term keeps Poisson noise in
small series from counting as spikes.

**Seasonality**: each 12-month block is divided by its own mean and blocks are averaged per
calendar month (spike-capped). Peaks ≥ 1.15, troughs ≤ 0.85. Skipped below 10 views/day.

## 5. Verdict and confidence

```
rising   : interval low > 0   and growth ≥ +5%
falling  : interval high < 0  and growth ≤ −5%
stable   : interval inside [−10%, +10%]
unclear  : anything else (the interval straddles zero and is wide)
```
Confidence starts at 3 points; flags subtract (table above). 3 = high, 2 = medium, ≤ 1 = low.
`unclear` and `insufficient` are always low. The same classification is applied to the
relative-to-edition growth (`normVerdict` in `analysis.json`).

## 6. Ranking (only with 2+ series)

Components, each min-max scaled to 0..1 across the candidates:
- **growth**: the pessimistic (2.5%) end of the relative-to-edition interval, so shaky or
  spike-driven growth cannot win by luck and platform-wide trends cancel out;
- **volume**: log10 of average monthly views (how many people read about it);
- **share**: log10 of views per million edition views (how prominent it is locally).

Score = weighted sum, default growth 0.4, volume 0.4, share 0.2; the user can override with
`--weights`. With only two candidates min-max scaling is coarse (0 or 1 per component); read
the components, not just the order.

## 7. Caching and API etiquette

- Wikimedia (2026) allows ~200 requests/minute for clients whose User-Agent contains a URL or
  email and far fewer for anonymous ones. The client sends
  `wiki-interest-research/<version> (<contact>)`, keeps ≤ 3 requests in flight and ≤ 150 per
  minute, and honours `Retry-After` on 429/503.
- Daily series are cached per (edition, title, access) with the covered date range, so a
  follow-up with a longer period downloads only the missing years; days older than 3 days are
  treated as final. Metadata (titles, sitelinks, redirects) is cached for 7 days.
- Cache folder: `~/.cache/wiki-interest-research` (override with `WIKI_SKILL_CACHE`).
