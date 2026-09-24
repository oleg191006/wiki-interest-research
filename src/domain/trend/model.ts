export interface ArticleRef {
  title: string;
  created?: string;
}

/** Daily human views of one topic (sum of its articles) in one edition, plus the edition's totals. */
export interface SeriesInput {
  id: string;
  topic: string;
  lang: string;
  days: string[];
  views: number[];
  desktop: number[]; // the desktop part of `views`; the rest is mobile
  projViews: number[];
  projDesktop: number[];
  articles: ArticleRef[];
  redirectShare?: number; // share of recent views that land on redirects (last 60 days)
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
  | "abrupt_start"
  | "redirect_share"
  | "ci_includes_zero"
  | "spikes_present"
  | "platform_context"
  | "seasonal";

export interface Flag {
  code: FlagCode;
  severity: "warn" | "info";
  params: Record<string, string | number>;
}

export interface Seasonality {
  peaks: Array<{ month: number; index: number }>;
  troughs: Array<{ month: number; index: number }>;
}

export interface YearTotal {
  from: string;
  to: string;
  total: number;
  growth: number | null;
}

export interface DailyDetail {
  days: string[];
  views: number[];
  median: number[];
  spike: boolean[];
}

export interface Spike {
  date: string;
  views: number;
  ratio: number;
  desktopShare: number;
}

export interface PeriodStats {
  total: number;
  avgMonthly: number;
  medianDaily: number;
  perMillion: number; // views per million pageviews of the whole language edition
  desktopShare: number;
  projectDesktopShare: number; // the same share for the whole edition, as a reference point
}

/** Everything measured for one topic in one language edition. */
export interface SeriesResult {
  id: string;
  topic: string;
  lang: string;
  monthly: number[];
  projectMonthly: number[];
  recent: PeriodStats;
  baseline: PeriodStats;
  growth: number | null;
  ci: [number, number] | null;
  growthDespiked: number | null;
  growthMedianDay: number | null;
  projectGrowth: number | null;
  normalizedGrowth: number | null;
  normCi: [number, number] | null;
  monthsUp: number;
  monthsCompared: number;
  signP: number;
  spikes: Spike[];
  spikeShareRecent: number;
  seasonality: Seasonality | null;
  yearly: YearTotal[] | null;
  verdict: Verdict;
  normVerdict: Verdict;
  confidence: Confidence;
  flags: Flag[];
  daily?: DailyDetail;
}
