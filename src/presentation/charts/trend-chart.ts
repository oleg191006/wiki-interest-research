import { legend } from "./legend.ts";
import { monthAxis } from "./month-axis.ts";
import { niceTicks } from "./scale.ts";
import { line, r1, svg, text, textWidth } from "./svg.ts";
import { INK } from "./theme.ts";

export interface TrendSeries {
  label: string;
  values: Array<number | null>;
  color: string;
  context?: boolean;
}

export function trendChart(o: {
  months: string[];
  series: TrendSeries[];
  recentStartIndex: number;
  locale: string;
  recentLabel: string;
  width?: number;
  height?: number;
}): string {
  const W = o.width ?? 520;
  const H = o.height ?? 250;
  const lg = legend(
    o.series.map((s) => ({
      kind: "line" as const,
      color: s.context ? INK.muted : s.color,
      label: s.label,
    })),
    8,
    W - 16,
  );
  const lastVal = (s: TrendSeries) =>
    [...s.values].reverse().find((v) => v !== null && Number.isFinite(v)) ?? null;
  const compact = W < 400;
  const endLabels = o.series
    .filter((s) => !s.context && lastVal(s) !== null)
    .map((s) => ({
      s,
      text: compact ? String(Math.round(lastVal(s)!)) : `${s.label} ${Math.round(lastVal(s)!)}`,
    }));
  const top = lg.height + 10;
  const bottom = 28;
  const left = 34;
  const right = Math.min(130, Math.max(24, ...endLabels.map((l) => textWidth(l.text, 8.5) + 12)));
  const pw = W - left - right;
  const ph = H - top - bottom;
  const all = o.series.flatMap((s) =>
    s.values.filter((v): v is number => v !== null && Number.isFinite(v)),
  );
  const ticks = niceTicks(
    Math.max(0, Math.min(100, ...all) * 0.95),
    Math.max(100, ...all) * 1.04,
    4,
  );
  const t0 = ticks[0];
  const tN = ticks[ticks.length - 1];
  const n = o.months.length;
  const x = (i: number) => left + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw);
  const y = (v: number) => top + ph - ((v - t0) / (tN - t0)) * ph;

  let body = lg.svg;
  if (o.recentStartIndex > 0 && o.recentStartIndex < n) {
    const bx = x(o.recentStartIndex) - (x(1) - x(0)) / 2;
    body += `<rect x="${r1(bx)}" y="${r1(top)}" width="${r1(left + pw - bx + 4)}" height="${r1(ph)}" fill="${INK.band}"/>`;
    body += text(bx + 4, top + 10, o.recentLabel, { size: 8, color: INK.muted });
  }
  for (const t of ticks) {
    body += line(left, y(t), left + pw, y(t), t === 100 ? INK.axis : INK.grid, 1);
    body += text(left - 5, y(t) + 3, String(Math.round(t)), {
      size: 8,
      color: INK.muted,
      anchor: "end",
    });
  }
  body += monthAxis(o.months, x, pw, top + ph + 11, o.locale);
  for (const s of o.series) {
    let d = "";
    let pen = false;
    s.values.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${r1(x(i))} ${r1(y(v))} `;
      pen = true;
    });
    const color = s.context ? INK.muted : s.color;
    body += `<path d="${d.trim()}" fill="none" stroke="${color}" stroke-width="${s.context ? 1.5 : 2}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }

  const ends = endLabels.map((l) => {
    const idx = l.s.values
      .map((v, i) => (v !== null && Number.isFinite(v) ? i : -1))
      .filter((i) => i >= 0)
      .pop()!;
    return { ...l, x: x(idx), y: y(l.s.values[idx]!) };
  });
  for (const e of ends)
    body += `<circle cx="${r1(e.x)}" cy="${r1(e.y)}" r="3.5" fill="${e.s.color}" stroke="${INK.surface}" stroke-width="2"/>`;
  const ys = ends.map((e) => e.y).sort((a, b) => a - b);
  const collide = ys.some((v, i) => i > 0 && v - ys[i - 1] < 11);
  if (!collide)
    for (const e of ends)
      body += text(e.x + 7, e.y + 3, e.text, { size: 8.5, color: INK.secondary });
  return svg(W, H, body);
}
