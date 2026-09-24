import { InputError } from "../errors.ts";

export interface Weights {
  growth: number;
  volume: number;
  share: number;
}

export const DEFAULT_WEIGHTS: Weights = { growth: 0.4, volume: 0.4, share: 0.2 };

export function parseWeights(text: string | undefined): Weights {
  if (!text) return { ...DEFAULT_WEIGHTS };
  const w: Weights = { growth: 0, volume: 0, share: 0 };
  for (const part of text.split(",")) {
    const [k, v] = part.split("=").map((x) => x.trim());
    if (!(k in w) || !Number.isFinite(Number(v)) || Number(v) < 0) {
      throw new InputError(
        `Bad --weights "${text}".`,
        "Use e.g. --weights growth=0.5,volume=0.3,share=0.2 (non-negative numbers).",
      );
    }
    w[k as keyof Weights] = Number(v);
  }
  const total = w.growth + w.volume + w.share;
  if (total <= 0) {
    throw new InputError("All weights are zero.", "Give at least one positive weight.");
  }
  return { growth: w.growth / total, volume: w.volume / total, share: w.share / total };
}
