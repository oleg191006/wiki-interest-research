export interface SeriesInput {
  id: string;
  topic: string;
  lang: string;
  days: string[];
  views: number[];
  projViews: number[];
}

export type Verdict = "rising" | "falling" | "flat" | "unclear" | "insufficient";
export type Confidence = "high" | "medium" | "low";

export type FlagCode = "no_baseline" | "very_low_volume" | "low_volume" | "inconsistent_months";

export interface Flag {
  code: FlagCode;
  severity: "warn" | "info";
  params: Record<string, string | number>;
}

export interface Spike {
  date: string;
  views: number;
  ratio: number;
}

export interface PeriodStats {
  total: number;
  avgMonthly: number;
  medianDaily: number;
  perMillion: number;
}
