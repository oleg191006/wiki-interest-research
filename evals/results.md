# Agent eval results

Scenarios: [`evals.json`](evals.json). Runner: [`run-claude.ts`](run-claude.ts) (real Claude Code, headless,
skill installed in `.claude/skills/`), checks: [`lib/checks.ts`](lib/checks.ts). Model: **Claude Haiku 4.5**
(`claude-haiku-4-5-20251001`).

Checks: `skill_used`, `cli_analyze` (used the bundled CLI), `no_custom_code` (no hand-written analysis
code or manual API calls), `numbers_grounded` (every % in the final answer appears in the tool output),
`mentions_confidence`, case-specific checks (missing Polish article reported, platform decline
separated, PDF created, follow-up re-run with changed arguments).

Iterations 1–3 ran on the first implementation of the skill. The code was then rewritten with the same
SKILL.md and byte-identical CLI output (see "Rewrite" below).

## Iteration 1 (first SKILL.md)

| case                    | checks          | tool calls | time | cost      |
| ----------------------- | --------------- | ---------- | ---- | --------- |
| fasting-pl-cs           | 5/6             | 10         | 62s  | $0.097    |
| astronomy-uk-trust      | 6/6             | 4          | 36s  | $0.056    |
| english-learning-report | 5/6             | 7          | 106s | $0.094    |
| country-codes           | 5/5             | 5          | 47s  | $0.058    |
| follow-up-change        | 6/6             | 4          | 52s  | $0.106    |
| **total**               | **27/29 (93%)** |            |      | **$0.41** |

What the transcripts showed:

- **Invented number**: "confidence intervals are wide (±15-20%)", not in the tool output (fasting-pl-cs).
- **No confidence stated** for a multi-language ranking answer (english-learning-report).
- **Weak article choice**: "English literature" used as a proxy for learning English.
- **Late triggering**: in the first case the model tried web search before loading the skill.
- **Placeholder confusion**: `SKILL/scripts/...` was read as a PowerShell variable `$env:SKILL`.
- Good: missing Polish article reported and a stand-in clearly labelled; UA/CZ mapped to uk/cs;
  the follow-up re-ran `analyze` with `--langs cs,de,sk --months 36` and produced a PDF.

Changes for iteration 2: description says "use this skill instead of web search or writing your own
code"; `<skill-dir>` placeholder with an explicit example; "every number must be copied from
summary.md"; verdict + confidence required for every series; choose articles by the user's intent;
no market claims absent from the data; a short "How to answer" block at the end of summary.md
(the last thing the model reads before answering).

## Iteration 2

| case                    | checks                                | tool calls | time | cost      |
| ----------------------- | ------------------------------------- | ---------- | ---- | --------- |
| fasting-pl-cs           | 6/6                                   | 5          | 47s  | $0.072    |
| astronomy-uk-trust      | 3/6 ⚠️                                | 16         | 151s | $0.135    |
| english-learning-report | 6/6                                   | 4          | 47s  | $0.069    |
| country-codes           | 5/5                                   | 3          | 21s  | $0.048    |
| follow-up-change        | 6/6                                   | 5          | 56s  | $0.129    |
| **total**               | **26/29** (23/23 without the ⚠️ case) |            |      | **$0.45** |

- The skill now triggers on the first tool call in every case; tool calls dropped from 4-10 to 3-5.
- Every answer gives verdict + confidence per series; no invented numbers; the English report uses
  IELTS/TOEFL-style articles; the follow-up drops Slovak after `find` shows no article and says so.
- ⚠️ astronomy-uk-trust failed for an environmental reason: the machine was under load (examples
  were being generated in parallel), PowerShell failed to start within 5 s and `node` returned a
  transient "Permission denied". The model then tried other shells and WSL-style paths and ended
  the turn while `analyze` was still running in the background.

Change for iteration 3: SKILL.md says to wait for `analyze` to finish, and on a system error to
repeat the same command with the same full path instead of switching shells or paths.

## Iteration 3 (final SKILL.md)

The near-miss case (1 check) was added here, so the total grows from 29 to 30.

| case                                | checks           | tool calls | time | cost      |
| ----------------------------------- | ---------------- | ---------- | ---- | --------- |
| fasting-pl-cs                       | 6/6              | 4          | 43s  | $0.064    |
| astronomy-uk-trust                  | 6/6              | 5          | 47s  | $0.070    |
| english-learning-report             | 6/6              | 10         | 113s | $0.127    |
| country-codes                       | 5/5              | 5          | 50s  | $0.059    |
| follow-up-change                    | 6/6              | 6          | 64s  | $0.141    |
| near-miss-no-trigger (separate run) | 1/1              | 0          | 5s   | $0.024    |
| **total**                           | **30/30 (100%)** |            |      | **$0.49** |

Notable behaviour:

- astronomy-uk-trust: the model chose a 60-month window on its own and reported the year-by-year
  history from the summary (stable until 2023, then −41% and −49%), without inventing causes.
- english-learning-report: the first `analyze` asked for 12 series; the CLI refused with "limit per
  run is 10, split the question", and the model retried with IELTS + TOEFL (8 series), gave verdict
  and confidence for every series, flagged the hidden Turkey/Vietnam country data, and wrote the PDF.
- near-miss-no-trigger ("write a TypeScript function that fetches a Wikipedia article's first
  paragraph"): the skill was correctly not loaded.

## Rewrite (current code)

The code was rewritten into layers without changing behaviour. SKILL.md differs only in Markdown
formatting, and the same analysis run through both versions produced byte-identical charts, CSVs and
PDFs (after normalising PDFKit's creation time and random `/ID`). A control run of the new code:

| case          | checks | tool calls | time | cost   |
| ------------- | ------ | ---------- | ---- | ------ |
| country-codes | 5/5    | 3          | 21s  | $0.043 |
