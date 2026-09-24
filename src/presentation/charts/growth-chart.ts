import { pct } from "../format.ts";
import { legend } from "./legend.ts";
import { niceTicks } from "./scale.ts";
import { line, r1, svg, text, textWidth } from "./svg.ts";
import { INK, PALETTE } from "./theme.ts";

export interface GrowthRow {
  label: string;
  growth: number | null;
  ci: [number, number] | null;
  norm: number | null;
}

export function growthChart(o: {
  rows: GrowthRow[];
  labels: { raw: string; norm: string };
  width?: number;
  layout?: "stacked" | "columns";
  rowHeight?: number;
}): string {
  const W = o.width ?? 360;
  const lg = legend(
    [
      { kind: "whisker", color: PALETTE[0], label: o.labels.raw },
      { kind: "diamond", color: PALETTE[1], label: o.labels.norm },
    ],
    8,
    W - 16,
  );

  const stacked = o.layout ? o.layout === "stacked" : W < 300;
  const labelW = stacked
    ? 0
    : Math.min(W * 0.45, Math.max(40, ...o.rows.map((r) => textWidth(r.label, 8.5))) + 6);
  const left = stacked ? 10 : labelW + 8;
  const right = 14;
  const top = lg.height + 12;
  const rowH = o.rowHeight ?? (stacked ? 36 : 30);
  const bottom = 20;
  const H = top + o.rows.length * rowH + bottom;
  const pw = W - left - right;
  const vals = o.rows
    .flatMap((r) => [r.growth, r.norm, r.ci?.[0] ?? null, r.ci?.[1] ?? null])
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const lo = Math.min(0, ...vals);
  const hi = Math.max(0, ...vals);
  const pad = Math.max(0.02, (hi - lo) * 0.12);
  const ticks = niceTicks(lo - pad, hi + pad, Math.max(2, Math.min(5, Math.floor(pw / 46))));
  const t0 = ticks[0];
  const tN = ticks[ticks.length - 1];
  const x = (v: number) => left + ((v - t0) / (tN - t0)) * pw;

  let body = lg.svg;
  for (const t of ticks) {
    body += line(x(t), top - 4, x(t), top + o.rows.length * rowH, t === 0 ? INK.axis : INK.grid, 1);
    body += text(x(t), H - 6, pct(t), { size: 7.5, color: INK.muted, anchor: "middle" });
  }
  o.rows.forEach((r, i) => {
    const cy = top + i * rowH + (stacked ? rowH - 12 : rowH / 2);
    if (stacked) body += text(left, cy - 12, r.label, { size: 8, color: INK.secondary });
    else body += text(labelW, cy + 3, r.label, { size: 8.5, color: INK.secondary, anchor: "end" });
    const marks = [r.growth, r.norm, r.ci?.[0], r.ci?.[1]].filter(
      (v): v is number => v !== null && v !== undefined && Number.isFinite(v),
    );
    if (r.ci && Number.isFinite(r.ci[0]) && Number.isFinite(r.ci[1])) {
      body += line(x(r.ci[0]), cy, x(r.ci[1]), cy, INK.lightBlue, 2);
      body += line(x(r.ci[0]), cy - 4, x(r.ci[0]), cy + 4, INK.lightBlue, 1.5);
      body += line(x(r.ci[1]), cy - 4, x(r.ci[1]), cy + 4, INK.lightBlue, 1.5);
    }
    if (r.norm !== null && Number.isFinite(r.norm)) {
      const nx = x(r.norm);
      body += `<path d="M${r1(nx)} ${r1(cy - 5)} L${r1(nx + 5)} ${r1(cy)} L${r1(nx)} ${r1(cy + 5)} L${r1(nx - 5)} ${r1(cy)} Z" fill="${INK.surface}" stroke="${PALETTE[1]}" stroke-width="1.8"/>`;
    }
    if (r.growth !== null && Number.isFinite(r.growth)) {
      const gx = x(r.growth);
      body += `<circle cx="${r1(gx)}" cy="${r1(cy)}" r="4.5" fill="${PALETTE[0]}" stroke="${INK.surface}" stroke-width="2"/>`;
      const label = pct(r.growth);
      const rightX = x(Math.max(...marks)) + 8;
      const fitsRight = rightX + textWidth(label, 8) <= W - 2;
      body += fitsRight
        ? text(rightX, cy + 3, label, { size: 8, color: INK.primary, bold: true })
        : text(x(Math.min(...marks)) - 8, cy + 3, label, {
            size: 8,
            color: INK.primary,
            bold: true,
            anchor: "end",
          });
    } else {
      body += text(left + 4, cy + 3, "n/a", { size: 8, color: INK.muted });
    }
  });
  return svg(W, H, body);
}
