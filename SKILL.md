---
name: wiki-interest-research
description: Measure and compare public interest in topics across Wikipedia language editions from Wikimedia pageview data, judge how trustworthy a trend is, and produce charts plus a one-page PDF brief. Use this skill whenever someone asks whether interest in a topic is growing or falling, which topics or languages to prioritize next, or wants Wikipedia pageview statistics compared across languages or over time.
compatibility: Node.js 20.10+, internet access to wikimedia.org and wikidata.org, and `npm ci` run once in this skill's folder.
---

# Wikipedia interest research

Measures how public interest in a topic changes over time in different Wikipedia language editions,
and how much that change can be trusted.

> **Status: under construction.** Only `doctor` works so far; `find`, `related`, `analyze` and
> `report` are being added step by step.

## Setup

Run once in this folder:

```
npm ci
```

Then check the environment (`<skill-dir>` is the folder holding this file):

```
node "<skill-dir>/scripts/wiki.mjs" doctor
```

## Commands

| Command  | What it does                                            |
| -------- | ------------------------------------------------------- |
| `doctor` | Checks Node version, dependencies and the skill folder. |
