import { sum } from "../stats.ts";
import type { MonthIndex } from "./month-index.ts";
import type { Seasonality, YearTotal } from "./model.ts";
import { VERY_LOW_VOLUME } from "./thresholds.ts";
import type { Windows } from "./windows.ts";

export function seasonality(
  w: Windows,
  index: MonthIndex,
  capped: number[],
  recentMedianDaily: number,
): Seasonality | null {
  const blocks = Math.floor(w.months.length / 12);
  if (blocks < 2 || recentMedianDaily < VERY_LOW_VOLUME) return null;

  const perCalendarMonth = new Map<number, number[]>();
  for (let k = 0; k < blocks; k++) {
    const blockMonths = w.months.slice(w.months.length - 12 * (k + 1), w.months.length - 12 * k);
    const values = blockMonths.map((m) => index.total(capped, m));
    const average = sum(values) / 12;
    if (average <= 0) continue;
    blockMonths.forEach((m, j) => {
      const calendarMonth = Number(m.slice(5, 7));
      if (!perCalendarMonth.has(calendarMonth)) perCalendarMonth.set(calendarMonth, []);
      perCalendarMonth.get(calendarMonth)!.push(values[j] / average);
    });
  }
  if (perCalendarMonth.size !== 12) return null;

  const indexed = [...perCalendarMonth.entries()].map(([month, v]) => ({
    month,
    index: sum(v) / v.length,
  }));
  return {
    peaks: indexed
      .filter((x) => x.index >= 1.15)
      .sort((a, c) => c.index - a.index)
      .slice(0, 2),
    troughs: indexed
      .filter((x) => x.index <= 0.85)
      .sort((a, c) => a.index - c.index)
      .slice(0, 2),
  };
}

export function yearlyHistory(w: Windows, index: MonthIndex, views: number[]): YearTotal[] | null {
  if (w.months.length < 36) return null;
  const yearly: YearTotal[] = [];
  const blocks = Math.floor(w.months.length / 12);
  for (let k = blocks - 1; k >= 0; k--) {
    const months = w.months.slice(w.months.length - 12 * (k + 1), w.months.length - 12 * k);
    const total = sum(months.map((m) => index.total(views, m)));
    const previous = yearly.length ? yearly[yearly.length - 1].total : null;
    yearly.push({
      from: months[0],
      to: months[11],
      total,
      growth: previous ? total / previous - 1 : null,
    });
  }
  return yearly;
}
