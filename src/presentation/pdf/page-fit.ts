import { sum } from "../../domain/stats.ts";
import type { Block } from "./blocks.ts";

export interface ContentVariant {
  daily: boolean; // daily chart (single-series reports only)
  info: boolean; // context notes among the trust bullets
  maxRecs: number;
  maxTrust: number;
  maxLimits: number;
  recChars: number;
  question: boolean;
  drops?: string; // what this step removes, reported to the agent
}

export const CONTENT_VARIANTS: readonly ContentVariant[] = [
  { daily: true, info: true, maxRecs: 5, maxTrust: 9, maxLimits: 6, recChars: 260, question: true },
  {
    daily: false,
    info: true,
    maxRecs: 5,
    maxTrust: 9,
    maxLimits: 6,
    recChars: 260,
    question: true,
    drops: "daily chart",
  },
  {
    daily: false,
    info: false,
    maxRecs: 5,
    maxTrust: 9,
    maxLimits: 6,
    recChars: 260,
    question: true,
    drops: "info-level checks",
  },
  {
    daily: false,
    info: false,
    maxRecs: 3,
    maxTrust: 5,
    maxLimits: 4,
    recChars: 160,
    question: true,
    drops: "extra recommendations and limitations",
  },
  {
    daily: false,
    info: false,
    maxRecs: 2,
    maxTrust: 3,
    maxLimits: 3,
    recChars: 120,
    question: false,
    drops: "question text",
  },
];

export const TEXT_SCALES = [1, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.79, 0.76, 0.73, 0.7];
export const BLOCK_GAP = 7;

export interface Fit {
  blocks: Block[];
  scale: number;
  variantIndex: number;
}

export function totalHeight(blocks: Block[], scale: number): number {
  return sum(blocks.map((b) => b.height(scale))) + BLOCK_GAP * scale * (blocks.length - 1);
}

export function fitOnePage(
  available: number,
  build: (v: ContentVariant) => Block[],
  variants: readonly ContentVariant[] = CONTENT_VARIANTS,
): Fit | null {
  for (let i = 0; i < variants.length; i++) {
    const blocks = build(variants[i]);
    const scale = TEXT_SCALES.find((s) => totalHeight(blocks, s) <= available);
    if (scale) return { blocks, scale, variantIndex: i };
  }
  return null;
}

export function drawBlocks(
  fit: Fit,
  top: number,
  onBlock?: (estimated: number, startY: number) => void,
): number {
  let y = top;
  for (const b of fit.blocks) {
    const h = b.height(fit.scale);
    if (h <= 0) continue;
    b.draw(y, fit.scale);
    onBlock?.(h, y);
    y += h + BLOCK_GAP * fit.scale;
  }
  return y;
}
