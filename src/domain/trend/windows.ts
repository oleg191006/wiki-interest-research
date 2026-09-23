import { addMonths, monthEnd, monthRange, monthStart } from "../calendar.ts";

export interface Windows {
  months: string[];
  recentMonths: string[];
  baselineMonths: string[];
  start: string;
  end: string;
  window: number;
}

/**
 * Compare the last `window` complete months with the same months a year earlier, so seasonality
 * cancels out. The chart period is at least 12 + window months so both periods are visible.
 */
export function makeWindows(endMonth: string, displayMonths: number, window: number): Windows {
  const w = Math.min(12, Math.max(3, Math.round(window)));
  const display = Math.max(Math.round(displayMonths), 12 + w);
  const recentMonths = monthRange(addMonths(endMonth, -(w - 1)), endMonth);
  const baselineMonths = recentMonths.map((m) => addMonths(m, -12));
  const first = addMonths(endMonth, -(display - 1));
  return {
    months: monthRange(first, endMonth),
    recentMonths,
    baselineMonths,
    start: monthStart(first),
    end: monthEnd(endMonth),
    window: w,
  };
}
