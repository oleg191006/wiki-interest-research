import { FONT, INK } from "./theme.ts";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const textWidth = (s: string, size: number) => s.length * size * 0.57; // slightly conservative for DejaVu Sans
export const r1 = (n: number) => Math.round(n * 10) / 10;

export interface TextOpts {
  size?: number;
  color?: string;
  anchor?: "start" | "middle" | "end";
  bold?: boolean;
}

export function text(x: number, y: number, s: string, o: TextOpts = {}): string {
  return `<text x="${r1(x)}" y="${r1(y)}" font-family="${FONT}" font-size="${o.size ?? 9}" fill="${o.color ?? INK.secondary}"${
    o.anchor && o.anchor !== "start" ? ` text-anchor="${o.anchor}"` : ""
  }${o.bold ? ' font-weight="bold"' : ""}>${esc(s)}</text>`;
}

export function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 1,
): string {
  return `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${color}" stroke-width="${width}"/>`;
}

export function svg(width: number, height: number, body: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.ceil(height)}" viewBox="0 0 ${width} ${Math.ceil(height)}">` +
    `<rect x="0" y="0" width="${width}" height="${Math.ceil(height)}" fill="${INK.surface}"/>${body}</svg>`
  );
}

export function svgSize(svgText: string): { width: number; height: number } {
  const m = /<svg[^>]*\swidth="([\d.]+)"[^>]*\sheight="([\d.]+)"/.exec(svgText);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : { width: 400, height: 200 };
}
