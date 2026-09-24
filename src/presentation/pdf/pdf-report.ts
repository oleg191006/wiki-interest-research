import type { Analysis } from "../../application/analysis-model.ts";
import type { RenderedReport, ReportRenderer, ReportText } from "../../application/ports.ts";
import { InputError } from "../../domain/errors.ts";
import type { UiLang } from "../../domain/languages/display-names.ts";
import { chartInputs } from "../charts/chart-data.ts";
import { dailyChart } from "../charts/daily-chart.ts";
import { growthChart } from "../charts/growth-chart.ts";
import { trendChart } from "../charts/trend-chart.ts";
import { Translator } from "../i18n/translator.ts";
import {
  answerBlock,
  chartPairBlock,
  fullWidthChartBlock,
  metricsTableBlock,
  methodBlock,
  questionBlock,
  sectionBlock,
  titleBlock,
  type Block,
} from "./blocks.ts";
import { CONTENT_VARIANTS, drawBlocks, fitOnePage, type ContentVariant } from "./page-fit.ts";
import { PdfCanvas } from "./pdf-canvas.ts";
import { buildReportContent, clip } from "./report-content.ts";
import { AVAILABLE_HEIGHT, CONTENT_WIDTH, GROWTH_WIDTH, PAGE, TREND_WIDTH } from "./theme.ts";

/** Chart SVG builders for the page; sizes depend on the text scale chosen by the page fit. */
function reportCharts(a: Analysis, tr: Translator) {
  const inputs = chartInputs(a, tr);
  const many = inputs.growthRows.length > 3; // with many series the growth chart uses short rows and a label column
  return {
    trend: (s: number) =>
      trendChart({
        months: a.windows.months,
        series: inputs.trendSeries,
        recentStartIndex: a.windows.months.indexOf(a.windows.recentMonths[0]),
        locale: tr.locale,
        recentLabel: tr.t("legend.recent"),
        width: TREND_WIDTH,
        height: 175 * s,
      }),
    growth: (s: number) =>
      growthChart({
        rows: inputs.growthRows,
        labels: { raw: tr.t("legend.raw"), norm: tr.t("legend.norm") },
        width: GROWTH_WIDTH,
        layout: many ? "columns" : "stacked",
        rowHeight: many ? Math.max(18, 22 * s) : undefined,
      }),
    daily: (s: number) =>
      dailyChart({
        panels: [{ ...inputs.dailyPanels[0], label: "" }],
        locale: tr.locale,
        labels: {
          daily: tr.t("legend.daily"),
          median: tr.t("legend.median"),
          spike: tr.t("legend.spike"),
        },
        width: CONTENT_WIDTH,
        panelHeight: 112 * s,
      }),
  };
}

/** One-page A4 brief: answer, metrics, charts, recommendations, trust checks, limitations, method. */
export class PdfReportRenderer implements ReportRenderer {
  private readonly debug?: (message: string) => void;

  constructor(debug?: (message: string) => void) {
    this.debug = debug;
  }

  async render(a: Analysis, ui: UiLang, text: ReportText, file: string): Promise<RenderedReport> {
    const tr = new Translator(ui);
    const canvas = new PdfCanvas(file, {
      Title: text.title ?? "Wikipedia interest report",
      Author: "wiki-interest-research",
      Subject: a.topics.map((x) => x.name).join(", "),
    });
    const content = buildReportContent(a, tr, text);
    const charts = reportCharts(a, tr);
    const singleSeries = a.series.length === 1;

    // Blocks shared by every layout attempt
    const title = titleBlock(canvas, content.title, content.subtitle);
    const question = questionBlock(canvas, tr.t("report.question"), content.question);
    const answer = answerBlock(canvas, tr.t("report.answer"), content.answer);
    const table = metricsTableBlock(canvas, tr.t("report.metrics"), content.table);
    const chartPair = chartPairBlock(
      canvas,
      { trend: tr.t("report.chartTrend"), growth: tr.t("report.chartGrowth") },
      charts,
    );
    const daily = fullWidthChartBlock(canvas, tr.t("report.chartDaily"), charts.daily);
    const method = methodBlock(
      canvas,
      tr.t("report.method"),
      content.method,
      tr.t("method.verify"),
      content.verifyLinks,
    );

    const build = (v: ContentVariant): Block[] => {
      const blocks: Block[] = [title];
      if (v.question) blocks.push(question);
      blocks.push(answer, table, chartPair);
      if (v.daily && singleSeries) blocks.push(daily);
      blocks.push(
        sectionBlock(
          canvas,
          content.actionsHeading,
          content.actions.slice(0, v.maxRecs).map((r) => clip(r, v.recChars)),
        ),
        sectionBlock(canvas, tr.t("report.trust"), content.trust(v.info).slice(0, v.maxTrust)),
        sectionBlock(canvas, tr.t("report.limits"), content.limits.slice(0, v.maxLimits), 7.8),
        method,
      );
      return blocks;
    };

    const fit = fitOnePage(AVAILABLE_HEIGHT, build);
    if (!fit) {
      throw new InputError(
        "The report does not fit on one page even with secondary sections removed.",
        "Shorten --answer (2-4 sentences) and pass at most 2-3 short --rec items, or analyze fewer series per report.",
      );
    }
    const end = drawBlocks(fit, PAGE.top, (h, startY) =>
      this.debug?.(
        `block estimated ${h.toFixed(1)} drawn-to ${(canvas.cursorY - startY).toFixed(1)}`,
      ),
    );
    this.debug?.(
      `scale ${fit.scale} used ${(end - PAGE.top).toFixed(1)} of ${AVAILABLE_HEIGHT.toFixed(1)}`,
    );

    const pages = canvas.pageCount();
    await canvas.finish();
    if (pages !== 1)
      throw new InputError(
        `Report layout overflowed to ${pages} pages.`,
        "Shorten --answer and --rec texts and retry.",
      );
    const dropped = CONTENT_VARIANTS.slice(0, fit.variantIndex + 1).flatMap((v) =>
      v.drops && !(v.drops === "daily chart" && !singleSeries) ? [v.drops] : [],
    );
    return { file, scale: fit.scale, dropped };
  }
}
