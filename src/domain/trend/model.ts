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

export interface PeriodStats {
  total: number;
  avgMonthly: number;
  medianDaily: number;
  perMillion: number;
}
