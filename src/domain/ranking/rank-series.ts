import type { SeriesResult } from "../trend/model.ts";
import type { Weights } from "./weights.ts";

export interface RankRow {
  id: string;
  rank: number;
  score: number;
  components: { growth: number; volume: number; share: number }; // each scaled to 0..1
  inputs: { conservativeGrowth: number; avgMonthly: number; perMillion: number };
}

function minMax(values: number[]): number[] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return values.map((v) => (hi > lo ? (v - lo) / (hi - lo) : 0.5));
}

export function rankSeries(results: SeriesResult[], weights: Weights): RankRow[] {
  const eligible = results.filter(
    (r) => r.normCi && Number.isFinite(r.normCi[0]) && r.recent.total > 0,
  );
  if (eligible.length < 2) return [];
  const g = eligible.map((r) => r.normCi![0]);
  const v = eligible.map((r) => Math.log10(r.recent.avgMonthly + 1));
  const s = eligible.map((r) => Math.log10(r.recent.perMillion + 0.01));
  const [gs, vs, ss] = [minMax(g), minMax(v), minMax(s)];
  const rows = eligible.map((r, i) => ({
    id: r.id,
    rank: 0,
    score: weights.growth * gs[i] + weights.volume * vs[i] + weights.share * ss[i],
    components: { growth: gs[i], volume: vs[i], share: ss[i] },
    inputs: {
      conservativeGrowth: g[i],
      avgMonthly: r.recent.avgMonthly,
      perMillion: r.recent.perMillion,
    },
  }));
  rows.sort((a, b) => b.score - a.score);
  rows.forEach((row, i) => (row.rank = i + 1));
  return rows;
}
