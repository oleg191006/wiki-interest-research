import type { Analysis } from "../../application/analysis-model.ts";
import type { ReportText } from "../../application/ports.ts";
import { labelIn } from "../../application/series-label.ts";
import { formatMonth } from "../../domain/calendar.ts";
import { countryName, languageName } from "../../domain/languages/display-names.ts";
import type { Confidence } from "../../domain/trend/model.ts";
import { ciText, num, pct } from "../format.ts";
import type { Translator } from "../i18n/translator.ts";

export const clip = (s: string, max: number) =>
  s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;

export interface MetricsTable {
  header: string[];
  rows: string[][];
  confidence: Confidence[];
}

export interface ReportContent {
  title: string;
  subtitle: string;
  question: string;
  answer: string;
  actionsHeading: string; // "Recommendations" from the agent, or auto "Suggested next steps"
  actions: string[]; // recommendations, then notes
  table: MetricsTable;
  method: string;
  verifyLinks: Array<[string, string]>;
  trust(includeInfo: boolean): string[];
  limits: string[];
}

export function buildReportContent(a: Analysis, tr: Translator, text: ReportText): ReportContent {
  const langsText = a.params.langs.map((l) => `${languageName(l, tr.locale)} (${l})`).join(", ");
  const recs = (text.recommendations.length ? text.recommendations : autoNextSteps(a, tr))
    .slice(0, 5)
    .map((r) => clip(r.trim(), 260));
  const notes = text.notes.slice(0, 3).map((n) => clip(n.trim(), 260));
  return {
    title: clip(
      text.title ?? tr.t("report.title", { topics: a.topics.map((x) => x.name).join(", ") }),
      110,
    ),
    subtitle: `${tr.t("report.subtitle", { langs: langsText, period: periodText(a.windows.months, tr) })} · ${a.generated}`,
    question: text.question ? clip(text.question.trim(), 320) : "",
    answer: clip(text.answer?.trim() || autoAnswer(a, tr), 900),
    actionsHeading: tr.t(
      text.recommendations.length ? "report.recommendations" : "report.nextSteps",
    ),
    actions: [...recs, ...notes],
    table: metricsTable(a, tr),
    method: methodText(a, tr),
    verifyLinks: Object.entries(a.verify),
    trust: (includeInfo) => trustBullets(a, tr, includeInfo),
    limits: limitBullets(a, tr),
  };
}

function periodText(months: string[], tr: Translator): string {
  return `${formatMonth(months[0], tr.locale)} – ${formatMonth(months[months.length - 1], tr.locale)}`;
}

function autoAnswer(a: Analysis, tr: Translator): string {
  return a.series
    .slice(0, 4)
    .map(
      (s) =>
        `${labelIn(a, s, tr.lang)}: ${tr.verdict(s.verdict)} (${tr.confidence(s.confidence)}), ${pct(s.growth)} ${tr.t("unit.yoy")} [${ciText(s.ci)}].`,
    )
    .join(" ");
}

function autoNextSteps(a: Analysis, tr: Translator): string[] {
  const out = [tr.t("auto.next.validate")];
  if (a.ranking.length) out.push(tr.t("auto.next.test"));
  if (a.topics.some((t) => Object.values(t.articles).some((arts) => arts.length === 1)))
    out.push(tr.t("auto.next.basket"));
  return out;
}

function metricsTable(a: Analysis, tr: Translator): MetricsTable {
  return {
    header: [
      tr.t("col.series"),
      tr.t("col.avg"),
      tr.t("col.growth"),
      tr.t("col.despiked"),
      tr.t("col.normalized"),
      tr.t("col.months"),
      tr.t("col.verdict"),
    ],
    rows: a.series.map((s) => [
      labelIn(a, s, tr.lang),
      num(s.recent.avgMonthly, tr.locale),
      `${pct(s.growth)} [${ciText(s.ci)}]`,
      pct(s.growthDespiked),
      pct(s.normalizedGrowth),
      `${s.monthsUp}/${s.monthsCompared}`,
      `${tr.verdict(s.verdict)} · ${tr.confidence(s.confidence, true)}`,
    ]),
    confidence: a.series.map((s) => s.confidence),
  };
}

function trustBullets(a: Analysis, tr: Translator, includeInfo: boolean): string[] {
  const out: string[] = [];
  const multi = a.series.length > 1;
  for (const severity of ["warn", "info"] as const) {
    if (severity === "info" && !includeInfo) continue;
    for (const s of a.series) {
      for (const f of s.flags.filter((x) => x.severity === severity))
        out.push(`${multi ? `${labelIn(a, s, tr.lang)}: ` : ""}${tr.flag(f)}`);
    }
  }
  if (!out.length) out.push(tr.t("report.noIssues"));
  return out.slice(0, 9);
}

function limitBullets(a: Analysis, tr: Translator): string[] {
  const countries = a.params.langs
    .map((l) => {
      const e = a.editions[l];
      if (e?.countriesHidden?.length)
        return tr.t("limit.countryHidden", {
          lang: l,
          country: e.countriesHidden.map((c) => countryName(c, tr.locale)).join(", "),
        });
      const top = e?.topCountries.slice(0, 2) ?? [];
      return top.length
        ? `${l}: ${top.map((c) => `${countryName(c.country, tr.locale)} ${Math.round(c.share * 100)}%`).join(", ")}`
        : "";
    })
    .filter(Boolean)
    .join("; ");
  const missing = a.topics.flatMap((t) =>
    Object.entries(t.missing)
      .filter(([, m]) => m.length)
      .map(([l]) => `${l} (${t.name})`),
  );
  const out = [tr.t("limit.intent")];
  if (countries) out.push(tr.t("limit.country", { countries }));
  out.push(tr.t("limit.human"), tr.t("limit.titles"), tr.t("limit.platform"));
  if (missing.length) out.push(tr.t("limit.missing", { items: missing.join(", ") }));
  return out;
}

function methodText(a: Analysis, tr: Translator): string {
  const w = a.windows;
  const m = tr.t("method.text", {
    recent: periodText(w.recentMonths, tr),
    baseline: periodText(w.baselineMonths, tr),
    date: a.generated,
    version: a.version,
  });
  const arts = a.params.langs
    .map(
      (l) =>
        `${l}: ${a.topics.flatMap((t) => t.articles[l].map((x) => x.title)).join(", ") || "—"}`,
    )
    .join("; ");
  return `${m} ${tr.t("method.articles")}: ${arts}.`;
}
