import type { Analysis, EditionContext, SeriesRecord } from "../../application/analysis-model.ts";
import { formatMonth } from "../../domain/calendar.ts";
import { countryName } from "../../domain/languages/display-names.ts";
import { ciText, compactNum, num, pct, perMillion } from "../format.ts";
import { Translator } from "../i18n/translator.ts";
import { quoteValue as q } from "./command-line.ts";

const period = (months: string[]) =>
  `${formatMonth(months[0], "en")} – ${formatMonth(months[months.length - 1], "en")}`;
const EN = new Translator("en");

export class SummaryView {
  private readonly launcher: string;

  /** @param launcher shell command that starts the skill, used in the "Next step" hint */
  constructor(launcher: string) {
    this.launcher = launcher;
  }

  render(a: Analysis, outDir: string): string {
    const sections = [
      header(a),
      articles(a),
      a.series.length ? [...results(a), ...findings(a), ...checks(a)] : [],
      editions(a),
      ranking(a),
      notes(a),
      files(a, outDir),
      HOW_TO_ANSWER,
      this.nextStep(outDir),
    ];
    return sections.flat().join("\n") + "\n";
  }

  private nextStep(outDir: string): string[] {
    return [
      "",
      "## Next step",
      "For a shareable one-page PDF run:",
      `${this.launcher} report --run ${q(outDir)} --lang <en|uk> --question ${q("<user question>")} --answer ${q("<2-4 sentences>")} --rec ${q("<recommendation>")} --rec ${q("<recommendation>")}`,
    ];
  }
}

const HOW_TO_ANSWER = [
  "",
  "## How to answer",
  "- Give verdict + confidence for every series, with the main reason from Checks.",
  "- Copy numbers exactly from this summary; do not estimate, combine or add numbers.",
  "- Say what the data cannot show (curiosity is not willingness to pay; a language is not a country); no invented causes or market claims.",
  "- End with one concrete validation step.",
];

function header(a: Analysis): string[] {
  const w = a.windows;
  return [
    `# Wikipedia interest: ${a.topics.map((tr) => tr.name).join(", ")} — ${a.params.langs.join(", ")}`,
    `Recent period ${period(w.recentMonths)} vs the same months a year earlier (${period(w.baselineMonths)}). ` +
      `Human views (agent=user), all platforms, current article titles. Charts cover ${period(w.months)}.`,
  ];
}

function articles(a: Analysis): string[] {
  const lines = ["", "## Articles measured"];
  for (const tr of a.topics) {
    const parts = a.params.langs.map((l) => {
      const arts = tr.articles[l] ?? [];
      const miss = tr.missing[l] ?? [];
      const used = arts.map((x) => `"${x.title}"`).join(", ");
      return `${l}: ${used || "— NO ARTICLE"}${miss.length && arts.length ? ` (missing: ${miss.join(", ")})` : ""}`;
    });
    lines.push(
      `- ${tr.name}${tr.qids.length ? ` [${tr.qids.join(", ")}]` : ""} → ${parts.join(" | ")}`,
    );
  }
  return lines;
}

function results(a: Analysis): string[] {
  const lines = [
    "",
    "## Results",
    "| Series | Views/month (recent) | YoY growth [95% CI] | Excl. spikes | vs whole edition | Months up | Verdict | Confidence |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const s of a.series) {
    lines.push(
      `| ${s.label} | ${num(s.recent.avgMonthly)} | ${pct(s.growth)} [${ciText(s.ci)}] | ${pct(s.growthDespiked)} | ${pct(s.normalizedGrowth)} | ${s.monthsUp}/${s.monthsCompared} | ${s.verdict} | ${s.confidence} |`,
    );
  }
  return lines;
}

function findings(a: Analysis): string[] {
  return [
    "",
    "## Key findings (computed; safe to quote)",
    ...a.series.map((s) => `- ${finding(s)}`),
  ];
}

function checks(a: Analysis): string[] {
  const lines = ["", "## Checks behind the verdicts"];
  for (const s of a.series) {
    for (const f of s.flags) lines.push(`- ${s.label} [${f.severity}]: ${EN.flag(f)}`);
    if (s.spikes.length) {
      lines.push(
        `- ${s.label} [info]: biggest spike days: ${s.spikes
          .slice(0, 3)
          .map((x) => `${x.date} (${num(x.views)} views, ${x.ratio.toFixed(1)}× normal)`)
          .join("; ")}. Do not invent causes; call any explanation a hypothesis.`,
      );
    }
    if (s.yearly)
      lines.push(
        `- ${s.label} [info]: longer history: ${s.yearly.map((y) => `${y.from}..${y.to} ${num(y.total)}${y.growth !== null ? ` (${pct(y.growth)})` : ""}`).join("; ")}.`,
      );
  }
  return lines;
}

function editions(a: Analysis): string[] {
  const lines = ["", "## Editions (context)"];
  for (const l of a.params.langs) {
    const e = a.editions[l];
    lines.push(
      `- ${l}.wikipedia: ${compactNum(e.totalRecent / Math.max(1, a.windows.recentMonths.length))} human views/month, ${pct(e.growth)} YoY` +
        `${e.uniqueDevices ? `; ~${compactNum(e.uniqueDevices)} unique devices/month` : ""}${readerCountries(e)}.`,
    );
  }
  for (const s of a.series) {
    lines.push(
      `- ${s.label}: ${perMillion(s.recent.perMillion)} views per million edition views (recent), ${perMillion(s.baseline.perMillion)} a year earlier.`,
    );
  }
  return lines;
}

function readerCountries(e: EditionContext): string {
  if (e.countriesHidden?.length) {
    return `; readers by country: INCOMPLETE — ${e.countriesHidden.map((c) => countryName(c, "en")).join(", ")} is omitted from Wikimedia's country data (privacy protection list), so do not read the remaining shares as the audience`;
  }
  if (!e.topCountries.length) return "";
  return `; readers by country (${e.countriesMonth}): ${e.topCountries
    .slice(0, 3)
    .map((c) => `${countryName(c.country, "en")} ${Math.round(c.share * 100)}%`)
    .join(", ")}`;
}

function ranking(a: Analysis): string[] {
  if (!a.ranking.length) return [];
  const wt = a.params.weights;
  const lines = [
    "",
    `## Ranking (weights: growth ${wt.growth.toFixed(2)}, volume ${wt.volume.toFixed(2)}, share ${wt.share.toFixed(2)})`,
    "Growth input is the pessimistic end of the 95% interval relative to the whole edition, so shaky growth cannot win on luck.",
  ];
  if (a.ranking.every((r) => r.inputs.conservativeGrowth < 0)) {
    lines.push(
      "Note: every candidate is declining at the pessimistic end, so this ranks the least-declining options, not growing ones. Say so.",
    );
  }
  for (const r of a.ranking) {
    const s = a.series.find((x) => x.id === r.id)!;
    lines.push(
      `${r.rank}. ${s.label} — score ${r.score.toFixed(2)} (growth ${r.components.growth.toFixed(2)}, volume ${r.components.volume.toFixed(2)}, share ${r.components.share.toFixed(2)}; conservative growth ${pct(r.inputs.conservativeGrowth)})`,
    );
  }
  return lines;
}

function notes(a: Analysis): string[] {
  return a.notes.length ? ["", "## Notes", ...a.notes.map((n) => `- ${n}`)] : [];
}

function files(a: Analysis, outDir: string): string[] {
  const lines = [
    "",
    "## Files",
    `Folder: ${outDir}`,
    "analysis.json (all numbers), monthly.csv, daily.csv, chart_trend.svg, chart_growth.svg, chart_daily.svg",
  ];
  const links = Object.entries(a.verify);
  if (links.length)
    lines.push(`Cross-check raw counts: ${links.map(([l, u]) => `${l}: ${u}`).join(" ; ")}`);
  return lines;
}

function finding(s: SeriesRecord): string {
  const g = pct(s.growth);
  const base = `${s.label}: ${s.verdict} (${s.confidence} confidence)`;
  const rel =
    s.normalizedGrowth !== null ? `; relative to the whole edition ${pct(s.normalizedGrowth)}` : "";
  const cons = `${s.monthsUp} of ${s.monthsCompared} months up`;
  switch (s.verdict) {
    case "rising":
    case "falling":
      return `${base} — ${g} YoY (95% CI ${ciText(s.ci)}), ${cons}, ${pct(s.growthDespiked)} excluding spikes${rel}.`;
    case "flat":
      return `${base} — ${g} YoY, 95% CI ${ciText(s.ci)} stays within ±10%${rel}.`;
    case "unclear":
      return `${base} — ${g} YoY but the 95% CI ${ciText(s.ci)} includes zero, so the change is not reliable${rel}.`;
    default:
      return `${base} — not enough data to compute growth.`;
  }
}
