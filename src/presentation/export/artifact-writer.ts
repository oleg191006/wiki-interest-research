import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Analysis } from "../../application/analysis-model.ts";
import { eachDay } from "../../domain/calendar.ts";
import { chartSvgs } from "../charts/chart-data.ts";
import type { Translator } from "../i18n/translator.ts";

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(rows: Array<Array<string | number>>): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

export class ArtifactWriter {
  writeData(outDir: string, a: Analysis): void {
    const seriesHeader = a.series.map((s) => `${s.topic} | ${s.lang}`);
    const monthly = a.windows.months.map((m, i) => [
      m,
      ...a.series.map((s) => s.monthly[i]),
      ...a.params.langs.map((l) => a.editions[l].monthly[i]),
    ]);
    writeFileSync(
      join(outDir, "monthly.csv"),
      csv([
        ["month", ...seriesHeader, ...a.params.langs.map((l) => `whole ${l}.wikipedia`)],
        ...monthly,
      ]),
    );
    const days = eachDay(a.windows.start, a.windows.end);
    const daily = days.map((d, i) => [d, ...a.series.map((s) => s.daily.views[i])]);
    writeFileSync(join(outDir, "daily.csv"), csv([["date", ...seriesHeader], ...daily]));
  }

  writeCharts(outDir: string, a: Analysis, tr: Translator): void {
    const c = chartSvgs(a, tr);
    writeFileSync(join(outDir, "chart_trend.svg"), c.trend);
    writeFileSync(join(outDir, "chart_growth.svg"), c.growth);
    writeFileSync(join(outDir, "chart_daily.svg"), c.daily);
  }

  writeSummary(outDir: string, markdown: string): void {
    writeFileSync(join(outDir, "summary.md"), markdown);
  }
}
