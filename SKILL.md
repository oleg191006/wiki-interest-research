---
name: wiki-interest-research
description: Measure and compare public interest in topics across Wikipedia language editions from Wikimedia pageview data, judge how trustworthy a trend is (spikes, bots, platform-wide traffic decline, low volume, renamed or missing articles), and produce charts plus a one-page PDF brief. Use this skill, instead of web search or writing your own code, whenever someone asks whether interest in a topic is growing or falling, which topics, courses or languages/markets to prioritize or localize into next, how much to trust a trend, or wants Wikipedia pageview statistics compared across languages or over time, even if Wikipedia is not mentioned (e.g. "is interest in astronomy growing among Ukrainian speakers?").
compatibility: Node.js 20.10+, internet access to wikimedia.org and wikidata.org, and `npm ci` run once in this skill's folder.
---

# Wikipedia interest research

The bundled CLI downloads Wikipedia pageviews, computes growth and trust checks, and writes
charts, a summary and a PDF. **All numbers come from the tool.** Your job is to pick the
right articles, run the commands, and turn the printed findings into a clear, honest answer.
Do not write your own analysis code, fetch the APIs yourself, or recompute numbers: the tool
already handles seasonality, spikes, bots and platform-wide traffic changes.

**Paths.** In the commands below, `<skill-dir>` stands for the absolute path of this skill's
folder (the "Base directory" shown when the skill was loaded). Always write the full path in
double quotes, for example `node "C:/Users/me/.claude/skills/wiki-interest-research/scripts/wiki.mjs" find ...`.
Run one command per tool call from the user's working folder; outputs go to
`./wiki-interest-output/<topic>_<langs>_<months>m/`.

## First use

```
node "<skill-dir>/scripts/wiki.mjs" doctor
```

If it prints FAIL for dependencies, run `npm ci --prefix "<skill-dir>"` once, then continue.

## Workflow

1. **Frame the question.** Identify topic(s), Wikipedia language codes (subdomains:
   `uk` Ukrainian, `pl` Polish, `cs` Czech, `en` English, ...) and period. Default: charts over
   the last 24 complete months; growth = last 12 months vs the same 12 months a year earlier
   (this cancels seasonality). Ask the user only if the topic or languages are truly ambiguous;
   otherwise state your assumption and proceed.

2. **Find the articles** (Wikidata links the same article across languages):

   ```
   node "<skill-dir>/scripts/wiki.mjs" find "intermittent fasting" --langs pl,cs
   ```

   Pick the candidate whose description matches the user's meaning. Search in English when
   possible; for non-English words add `--search-lang uk` (etc.).
   - Choose articles whose readers have the **intent that matters to the user**. For
     "learning English" use pages like IELTS, TOEFL or English as a second language, not
     "English literature"; for a course, pages a learner of the subject would read.
   - **Broad topic** (astronomy, programming, healthy eating): one article is a weak proxy.
     Build a basket of 3-7 central, well-read articles with
     `node "<skill-dir>/scripts/wiki.mjs" related Q333 --langs uk` (skip people, niche pages,
     single objects).
   - **Narrow topic** (a diet, an exam, a product type): 1-3 articles are enough.
   - If a language has **no article**, that topic cannot be measured there. Report this as a
     finding. Do not silently substitute a loosely related article; if you use a stand-in,
     add it explicitly (`pl:Title`) and say so in the answer.

3. **Analyze** (one run holds up to 10 series = topics × languages):

   ```
   node "<skill-dir>/scripts/wiki.mjs" analyze --topic "Astronomy=Q333,Q544,Q589" --langs uk
   node "<skill-dir>/scripts/wiki.mjs" analyze --topic "IELTS=Q490396" --topic "TOEFL=Q487425" --langs pl,tr,vi
   ```

   Options: `--months 36` (longer charts), `--window 6` (last 6 months vs the same 6 months a
   year before), `--weights growth=0.6,volume=0.2,share=0.2` (the user's own criteria for
   "promising"), `--ui-lang uk` (chart labels). The first run can take up to a minute while
   data downloads; repeats take seconds. Wait for it to finish and read its output before
   answering. The printed summary is also saved as `summary.md`; read that file if console
   output looks garbled.

4. **Answer** from the summary (rules and shape below).

5. **PDF brief** when the user asks for a report, something to share, or compares several
   languages/topics. Write the texts in the user's language:

   ```
   node "<skill-dir>/scripts/wiki.mjs" report --run "<folder printed by analyze>" --lang uk --question "<user's question>" --answer "<2-4 sentences>" --rec "<recommendation>" --rec "<recommendation>"
   ```

   Use double quotes and avoid `$` in texts. For long texts use `--text-file brief.json`
   (`{"question": "...", "answer": "...", "recommendations": ["..."]}`). Give the user the PDF path.

6. **Follow-ups** ("add Slovak", "use 3 years", "weight growth higher"): re-run `analyze` with
   changed arguments. Downloaded data is cached, so repeated and related queries take seconds.
   Re-create the PDF if one was requested.

## Reading the summary

- **Verdict**: `rising` / `falling` (the 95% interval excludes zero and the change is at least
  5%), `stable` (interval within ±10%), `unclear` (interval includes zero: no conclusion).
- **Confidence** (high / medium / low) starts high and drops for low volume, growth made of
  a few spike days, months that disagree, bot-like traffic, new or renamed articles, or a
  trend that only mirrors the whole edition. The reasons are listed under _Checks_.
- **vs whole edition**: growth after removing the edition's overall traffic change. Wikipedia
  traffic fell in many editions in 2025-26, so a topic can decline in raw views yet gain
  share. Mention it whenever it differs noticeably from raw growth.
- **Excl. spikes** and **Months up** show whether the change is broad-based.
- **Ranking** (several series): uses the pessimistic end of relative growth, plus volume and
  share. If every candidate declines, it ranks the least-declining ones; say so.
- **Editions**: readers by country. `INCOMPLETE` means Wikimedia hides the main country
  (privacy protection), so the remaining shares are not the audience.

## Rules for conclusions

- **Every number you write must be copied from summary.md** (or analysis.json). Do not
  estimate ranges, add or subtract figures, or use numbers from memory; before answering,
  check each number against the summary. Invented numbers are the most common failure.
- Give **verdict + confidence for every series** you mention, with the main reason. If the
  verdict is `unclear` or confidence is `low`, say plainly that the data does not support a
  firm conclusion.
- Never invent causes for spikes or trends, and do not add market claims the data does not
  contain (competition, saturation, user habits). Label any general knowledge as an assumption.
- State the limitations that matter for the decision: pageviews show curiosity, not
  willingness to pay; a language edition is not a country; missing articles are gaps, not zero
  interest.
- End with a concrete next step to validate (second data source, small demand test).

Answer shape (in the user's language):

1. One-sentence answer: direction + confidence.
2. Evidence: 2-4 bullets per series with the printed numbers (growth and interval, months up,
   vs whole edition, volume).
3. Caveats: 1-3 bullets from _Checks_ and the limitations above.
4. Next step, then file paths (summary, PDF).

## When something fails

- A system error (permission denied, shell timeout, command moved to background) → run the
  same command again with the same full path; do not switch to other paths or shells.
- `looks like a country code` → use the suggested language code (ua→uk, cz→cs).
- `HTTP 429` → wait a minute and retry; setting `WIKI_SKILL_CONTACT` to a URL/email helps.
- `no article` everywhere → try `find` with other wording or `--search-lang` of the topic.
- `report does not fit` → shorten `--answer` to 2-4 sentences and use at most 3 `--rec`.

## More detail (read only when needed)

- `references/methodology.md`: exact definitions, thresholds and why; read when the user asks
  how a number was computed or challenges a verdict.
- `references/interpretation.md`: choosing articles, common patterns and how to word them,
  language vs market caveats, what to recommend next.
- `references/commands.md`: every option and output file (analysis.json fields, CSVs, charts).
