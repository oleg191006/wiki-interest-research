import { eachDay } from "../src/domain/calendar.ts";
import { mulberry32 } from "../src/domain/stats.ts";
import { analyzeSeries } from "../src/domain/trend/analyze-series.ts";
import type { SeriesInput } from "../src/domain/trend/model.ts";
import { makeWindows, type Windows } from "../src/domain/trend/windows.ts";

// recent Sep 2025 - Aug 2026, baseline Sep 2024 - Aug 2025
export const W: Windows = makeWindows("2026-08", 24, 12);
export const DAYS = eachDay(W.start, W.end);
export const RECENT_START = "2025-09-01";

export interface Synth {
  views: (day: string, i: number) => number;
  project?: (day: string, i: number) => number;
  desktopShare?: (day: string, i: number) => number;
  projectDesktopShare?: number;
  noise?: number; // relative day-to-day noise, deterministic
  created?: string;
}

/** Build a SeriesInput from formulas; noise comes from a seeded PRNG so tests are deterministic. */
export function synth(id: string, o: Synth): SeriesInput {
  const rand = mulberry32(42);
  const noise = o.noise ?? 0.05;
  const views = DAYS.map((d, i) =>
    Math.max(0, Math.round(o.views(d, i) * (1 + noise * (rand() * 2 - 1)))),
  );
  const proj = DAYS.map((d, i) => Math.round(o.project ? o.project(d, i) : 1_000_000));
  const deskShare = DAYS.map((d, i) => (o.desktopShare ? o.desktopShare(d, i) : 0.3));
  return {
    id,
    topic: id,
    lang: "xx",
    days: DAYS,
    views,
    desktop: views.map((v, i) => Math.round(v * deskShare[i])),
    projViews: proj,
    projDesktop: proj.map((p) => Math.round(p * (o.projectDesktopShare ?? 0.3))),
    articles: [{ title: id, created: o.created ?? "2010-01-01" }],
  };
}

export function run(id: string, o: Synth) {
  return analyzeSeries(synth(id, o), W);
}

export const isRecent = (d: string) => d >= RECENT_START;

/** A yearly wave with the given amplitude, peaking in the middle of the year. */
export const seasonal = (d: string, amp: number) =>
  1 + amp * Math.sin((2 * Math.PI * Number(d.slice(5, 7))) / 12);
