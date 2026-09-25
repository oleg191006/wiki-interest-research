# Command reference

`node "SKILL/scripts/wiki.mjs" <command> [options]` (`SKILL` = this skill's folder). Output goes
to stdout; progress and errors to stderr. Exit codes: 0 ok, 1 bad input (the message has a
`Hint:` line), 2 setup problem, 3 network/API problem.

## find `<text>`
Wikidata candidates with their article title in each requested language.
- `--langs pl,cs` show titles in these editions (and keyword matches where missing)
- `--search-lang en` language of `<text>` (default en; use uk/pl/... for non-English words)
- `--limit 6` number of candidates

## related `<QID>`
Similar articles ("morelike" search on the `--lang` edition, default en) with views/day and
availability in `--langs`. Navigation pages (outlines, lists, glossaries) are filtered out.

## analyze
- `--topic "Name=Q1,Q2,pl:Title"` (repeatable). Items: Wikidata QIDs, or `lang:Title` for a
  language-specific article. Free text (`--topic "intermittent fasting"`) is resolved to the
  best Wikidata match and noted in *Notes*; prefer explicit QIDs.
- `--langs uk,pl` Wikipedia language codes (country codes like ua/cz are rejected with a hint)
- `--months 24` chart period; `--window 12` comparison window (3-12 months)
- `--weights growth=0.4,volume=0.4,share=0.2` ranking weights (normalized to sum 1)
- `--ui-lang en|uk` chart labels; `--search-lang` for free-text topics
- `--out DIR` output folder; `--no-redirects` skip the redirect check
- `--refresh` re-download; `--offline` cache only

Limits: 10 series (topics × languages) and 10 items per topic per run.

### Output folder
| File | Content |
|---|---|
| `summary.md` | what the agent reads (also printed) |
| `analysis.json` | every number: `windows`, `topics[].articles/missing`, `editions`, `series[]` (growth, ci, growthDespiked, normalizedGrowth, normCi, monthsUp, signP, spikes, seasonality, yearly, flags, verdict, confidence, monthly, projectMonthly, daily), `ranking`, `verify` |
| `monthly.csv` | monthly views per series + whole-edition totals |
| `daily.csv` | daily views per series |
| `chart_trend.svg` | monthly index (baseline = 100); single series also shows the whole edition |
| `chart_growth.svg` | YoY growth with 95% interval and relative-to-edition marker |
| `chart_daily.svg` | daily views, 29-day median, spike days |
| `report.pdf` | created by `report` |

## report
- `--run DIR` folder from analyze (required)
- `--lang en|uk` language of the PDF's fixed texts
- `--title`, `--question`, `--answer` (2-4 sentences), `--rec` (repeatable, ≤ 5), `--note` (≤ 3)
- `--text-file brief.json` with `{"title","question","answer","recommendations":[],"notes":[]}`
- `--out file.pdf` custom path

The PDF is always exactly one A4 page: text scales down to 70% and secondary sections are
dropped (the command reports what was omitted) before it would overflow.

## doctor / cache
`doctor` checks Node, dependencies, cache and network. `cache` shows size; `cache --clear`
empties it.

## Environment
- `WIKI_SKILL_CONTACT` URL or email for the User-Agent (Wikimedia rate limits depend on it)
- `WIKI_SKILL_CACHE` cache folder
- `WIKI_SKILL_TODAY` pin "today" (reproducible runs and tests)
