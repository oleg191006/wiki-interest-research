import { quantile } from "../../domain/stats.ts";
import { legend } from "./legend.ts";
import { monthAxis } from "./month-axis.ts";
import { niceTicks } from "./scale.ts";
import { line, r1, svg, text, textWidth } from "./svg.ts";
import { INK, PALETTE } from "./theme.ts";

export interface DailyPanel {
  label: string;
  days: string[];
  views: number[];
  median: number[];
  spike: boolean[];
}

export function dailyChart(o: {
  panels: DailyPanel[];
  locale: string;
  labels: { daily: string; median: string; spike: string };
  width?: number;
  panelHeight?: number;
}): string {
  const W = o.width ?? 520;
  const PH = o.panelHeight ?? 120;
  const lg = legend(
    [
      { kind: "thinline", color: INK.lightBlue, label: o.labels.daily },
      { kind: "line", color: INK.darkBlue, label: o.labels.median },
      { kind: "dot", color: PALETTE[1], label: o.labels.spike },
    ],
    8,
    W - 16,
  );
  let body = lg.svg;
  let y0 = lg.height + 6;
  const left = 40;
  const right = 12;
  const pw = W - left - right;
  for (const p of o.panels) {
    const titleH = p.label ? 14 : 4;
    const top = y0 + titleH;
    const ph = PH - titleH - 26;
    if (p.label) body += text(left, y0 + 10, p.label, { size: 9, color: INK.primary, bold: true });
    const cap = Math.max(quantile(p.views, 0.995), 1.3 * Math.max(...p.median), 10);
    const ticks = niceTicks(0, cap, 3);
    const tN = ticks[ticks.length - 1];
    const n = p.days.length;
    const x = (i: number) => left + (n <= 1 ? 0 : (i / (n - 1)) * pw);
    const y = (v: number) => top + ph - (Math.min(v, tN) / tN) * ph;
    for (const t of ticks) {
      body += line(left, y(t), left + pw, y(t), t === 0 ? INK.axis : INK.grid, 1);
      body += text(left - 5, y(t) + 3, t >= 10_000 ? `${Math.round(t / 1000)}k` : String(t), {
        size: 7.5,
        color: INK.muted,
        anchor: "end",
      });
    }
    const path = (vals: number[]) =>
      vals.map((v, i) => `${i ? "L" : "M"}${r1(x(i))} ${r1(y(v))}`).join(" ");
    body += `<path d="${path(p.views)}" fill="none" stroke="${INK.lightBlue}" stroke-width="0.8" stroke-linejoin="round"/>`;
    body += `<path d="${path(p.median)}" fill="none" stroke="${INK.darkBlue}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;
    const spikeIdx = p.spike.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
    for (const i of spikeIdx) {
      const off = p.views[i] > tN;
      body += off
        ? `<path d="M${r1(x(i))} ${r1(top - 1)} L${r1(x(i) + 3.5)} ${r1(top + 5)} L${r1(x(i) - 3.5)} ${r1(top + 5)} Z" fill="${PALETTE[1]}"/>`
        : `<circle cx="${r1(x(i))}" cy="${r1(y(p.views[i]))}" r="2.6" fill="${PALETTE[1]}" stroke="${INK.surface}" stroke-width="1.2"/>`;
    }
    const topSpikes = [...spikeIdx].sort((a, b) => p.views[b] - p.views[a]).slice(0, 2);
    for (const i of topSpikes) {
      const label = `${p.days[i]} · ${p.views[i].toLocaleString("en-US")}`;
      const tx = Math.min(
        Math.max(x(i), left + textWidth(label, 7.5) / 2),
        left + pw - textWidth(label, 7.5) / 2,
      );
      body += text(tx, top - 3, label, { size: 7.5, color: INK.muted, anchor: "middle" });
    }
    const months = [...new Set(p.days.map((d) => d.slice(0, 7)))];
    const firstDay = months.map((m) => p.days.findIndex((d) => d.startsWith(m)));
    body += monthAxis(months, (k) => x(firstDay[k]), pw, top + ph + 11, o.locale);
    y0 += PH;
  }
  return svg(W, y0 + 4, body);
}
