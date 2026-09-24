import type { RankRow } from "../domain/ranking/rank-series.ts";
import type { Weights } from "../domain/ranking/weights.ts";
import type { SeriesResult } from "../domain/trend/model.ts";
import type { Windows } from "../domain/trend/windows.ts";
import type { CountryShare } from "./wiki-types.ts";

export interface ArticleUse {
  qid?: string;
  title: string;
  requested: string;
  exists: boolean;
  redirectedFrom?: string;
  disambiguation: boolean;
  created?: string;
  views60?: number;
  redirectViews60?: number;
}

export interface TopicReport {
  name: string;
  qids: string[];
  articles: Record<string, ArticleUse[]>;
  missing: Record<string, string[]>;
}

export interface EditionContext {
  code: string;
  project: string;
  monthly: number[]; // human views of the whole edition, aligned with windows.months
  totalRecent: number;
  totalBaseline: number;
  growth: number | null;
  uniqueDevices: number | null; // monthly average over the recent window
  topCountries: CountryShare[];
  countriesMonth: string;
  countriesHidden: string[]; // main countries absent from the list (Wikimedia privacy protection)
}

export type SeriesRecord = Omit<SeriesResult, "daily"> & {
  label: string;
  daily: { views: number[]; median: number[]; spikeIdx: number[] };
};

export interface AnalysisParams {
  topics: string[];
  langs: string[];
  months: number;
  window: number;
  searchLang: string;
  redirects: boolean;
  weights: Weights;
}

export interface Analysis {
  tool: string;
  version: string;
  generated: string;
  command: string;
  params: AnalysisParams;
  windows: Windows;
  notes: string[];
  topics: TopicReport[];
  editions: Record<string, EditionContext>;
  series: SeriesRecord[];
  ranking: RankRow[];
  verify: Record<string, string>;
}

export function toSeriesRecord(result: SeriesResult, label: string): SeriesRecord {
  const { daily, ...rest } = result;
  return {
    ...rest,
    label,
    daily: {
      views: daily!.views,
      median: daily!.median.map((v) => Math.round(v * 10) / 10),
      spikeIdx: daily!.spike.map((s, i) => (s ? i : -1)).filter((i) => i >= 0),
    },
  };
}
