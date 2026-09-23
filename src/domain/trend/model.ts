export interface SeriesInput {
  id: string;
  topic: string;
  lang: string;
  days: string[];
  views: number[];
  projViews: number[];
}

export interface PeriodStats {
  total: number;
  avgMonthly: number;
  medianDaily: number;
  perMillion: number;
}
