export interface SeriesInput {
  id: string;
  topic: string;
  lang: string;
  days: string[];
  views: number[];
  desktop: number[]; // the desktop part of `views`; the rest is mobile
  projViews: number[];
  projDesktop: number[];
}

export type Verdict = "rising" | "falling" | "flat" | "unclear" | "insufficient";
export type Confidence = "high" | "medium" | "low";

export type FlagCode =
  | "no_baseline"
  | "very_low_volume"
  | "low_volume"
  | "inconsistent_months"
  | "spike_driven"
  | "platform_opposite"
  | "bot_suspected"
  | "article_new"
  | "abrupt_start";

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
  perMillion: number; // views per million pageviews of the whole language edition
  desktopShare: number;
  projectDesktopShare: number; // the same share for the whole edition, as a reference point
}
