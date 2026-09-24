import { monthOf } from "../calendar.ts";
import { median, sum } from "../stats.ts";
import type { PeriodStats, SeriesInput } from "./model.ts";

export function periodStats(positions: number[], s: SeriesInput): PeriodStats {
  const pick = (a: number[]) => positions.map((i) => a[i]);
  const total = sum(pick(s.views));
  const proj = sum(pick(s.projViews));
  const months = new Set(positions.map((i) => monthOf(s.days[i]))).size || 1;
  return {
    total,
    avgMonthly: total / months,
    medianDaily: median(pick(s.views)),
    perMillion: proj > 0 ? (total / proj) * 1e6 : 0,
    desktopShare: total > 0 ? sum(pick(s.desktop)) / total : 0,
    projectDesktopShare: proj > 0 ? sum(pick(s.projDesktop)) / proj : 0,
  };
}
