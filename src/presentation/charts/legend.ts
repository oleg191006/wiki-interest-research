import { INK } from "./theme.ts";
import { line, text, textWidth } from "./svg.ts";

export type LegendKind = "line" | "thinline" | "whisker" | "diamond" | "dot" | "band";

export function legend(
  items: Array<{ kind: LegendKind; color: string; label: string }>,
  x0: number,
  width: number,
): { svg: string; height: number } {
  let x = x0;
  let y = 10;
  let out = "";
  for (const it of items) {
    const w = 20 + textWidth(it.label, 8.5) + 14;
    if (x + w > x0 + width && x > x0) {
      x = x0;
      y += 14;
    }
    const cy = y - 3;
    if (it.kind === "line" || it.kind === "thinline")
      out += line(x, cy, x + 14, cy, it.color, it.kind === "line" ? 2 : 1);
    else if (it.kind === "whisker")
      out +=
        line(x, cy, x + 14, cy, INK.lightBlue, 2) +
        `<circle cx="${x + 7}" cy="${cy}" r="3.5" fill="${it.color}" stroke="${INK.surface}" stroke-width="1.5"/>`;
    else if (it.kind === "diamond")
      out += `<path d="M${x + 7} ${cy - 4.5} L${x + 11.5} ${cy} L${x + 7} ${cy + 4.5} L${x + 2.5} ${cy} Z" fill="${INK.surface}" stroke="${it.color}" stroke-width="1.8"/>`;
    else if (it.kind === "dot")
      out += `<circle cx="${x + 7}" cy="${cy}" r="3" fill="${it.color}" stroke="${INK.surface}" stroke-width="1.5"/>`;
    else out += `<rect x="${x}" y="${cy - 5}" width="14" height="10" fill="${INK.band}"/>`;
    out += text(x + 19, y, it.label, { size: 8.5 });
    x += w;
  }
  return { svg: out, height: y + 6 };
}
