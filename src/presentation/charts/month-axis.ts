import { monthShort } from "../../domain/calendar.ts";
import { INK } from "./theme.ts";
import { text } from "./svg.ts";

export function monthAxis(
  months: string[],
  xAt: (i: number) => number,
  plotWidth: number,
  y: number,
  locale: string,
): string {
  const maxLabels = Math.max(2, Math.floor(plotWidth / 34));
  const step = [1, 2, 3, 4, 6, 12, 24].find((s) => Math.ceil(months.length / s) <= maxLabels) ?? 24;
  const idx: number[] = [];
  for (let i = months.length - 1; i >= 0; i -= step) idx.unshift(i);
  let prevYear = "";
  let out = "";
  for (const i of idx) {
    const year = months[i].slice(0, 4);
    out += text(xAt(i), y, monthShort(months[i], locale), {
      size: 7.5,
      color: INK.muted,
      anchor: "middle",
    });
    if (year !== prevYear)
      out += text(xAt(i), y + 9, year, { size: 7.5, color: INK.muted, anchor: "middle" });
    prevYear = year;
  }
  return out;
}
