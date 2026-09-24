import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isRecent, run, seasonal } from "./helpers.ts";

const codes = (r: { flags: Array<{ code: string }> }) => r.flags.map((f) => f.code);

describe("analyzeSeries on synthetic data with known answers", () => {
  it("steady +20% growth is rising with high confidence and a tight interval", () => {
    const r = run("steady", { views: (d) => (isRecent(d) ? 240 : 200) });
    assert.ok(Math.abs(r.growth! - 0.2) < 0.01, `growth ${r.growth}`);
    assert.ok(r.ci![0] > 0.15 && r.ci![1] < 0.25, `ci ${r.ci}`);
    assert.equal(r.monthsUp, 12);
    assert.equal(r.verdict, "rising");
    assert.equal(r.confidence, "high");
  });

  it("pure seasonality without growth is flat, not rising or falling", () => {
    const r = run("seasonal", { views: (d) => 300 * seasonal(d, 0.4) });
    assert.ok(Math.abs(r.growth!) < 0.02, `growth ${r.growth}`);
    assert.equal(r.verdict, "flat");
    assert.ok(r.seasonality && r.seasonality.peaks.length > 0, "should detect seasonal peaks");
  });

  it("growth made of a few spike days is not reported as reliable growth", () => {
    const spikes = new Set(["2026-01-10", "2026-01-11", "2026-01-12", "2026-01-13"]);
    const r = run("spiky", { views: (d) => (spikes.has(d) ? 20_000 : 200), noise: 0.02 });
    assert.ok(r.growth! > 0.9, `raw growth should look big: ${r.growth}`);
    assert.ok(Math.abs(r.growthDespiked!) < 0.03, `despiked growth ~0: ${r.growthDespiked}`);
    assert.ok(r.spikes.length >= 4);
    assert.ok(
      r.verdict !== "rising" || r.confidence === "low",
      `verdict ${r.verdict}/${r.confidence}`,
    );
  });

  // Seven months up, five months down: the interval still excludes zero, so the verdict is
  // "rising" with a tight interval. Only MonthConsistencyCheck sees that the trend is uneven.
  it("growth carried by a minority of months is flagged as inconsistent", () => {
    const up = new Set([
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    const r = run("uneven", {
      views: (d) => (isRecent(d) ? (up.has(d.slice(0, 7)) ? 400 : 280) : 300),
      noise: 0,
    });
    assert.equal(r.verdict, "rising", `verdict ${r.verdict}`);
    assert.ok(r.ci![0] > 0, `interval should exclude zero: ${r.ci}`);
    assert.equal(r.monthsUp, 7);
    assert.ok(codes(r).includes("inconsistent_months"), JSON.stringify(codes(r)));
    assert.notEqual(r.confidence, "high");
  });

  it("a platform-wide decline is separated from topic interest", () => {
    const r = run("platform", {
      views: () => 500,
      project: (d) => (isRecent(d) ? 800_000 : 1_000_000),
    });
    assert.equal(r.verdict, "flat");
    assert.ok(Math.abs(r.normalizedGrowth! - 0.25) < 0.02, `normalized ${r.normalizedGrowth}`);
    assert.equal(r.normVerdict, "rising");
    assert.ok(codes(r).includes("platform_context"));
  });

  it("raw decline that only mirrors the platform lowers confidence", () => {
    const r = run("mirror", {
      views: (d) => (isRecent(d) ? 400 : 500),
      project: (d) => (isRecent(d) ? 700_000 : 1_000_000),
    });
    assert.equal(r.verdict, "falling");
    assert.ok(codes(r).includes("platform_opposite"));
    assert.notEqual(r.confidence, "high");
  });

  it("a desktop-only surge is flagged as possible automated traffic", () => {
    const r = run("bots", {
      views: (d) => (isRecent(d) ? 500 : 250),
      desktopShare: (d) => (isRecent(d) ? 0.8 : 0.3),
    });
    assert.ok(codes(r).includes("bot_suspected"));
    assert.notEqual(r.confidence, "high");
  });

  it("very low volume always means low confidence", () => {
    const r = run("tiny", { views: (d) => (isRecent(d) ? 6 : 3), noise: 0.3 });
    assert.ok(codes(r).includes("very_low_volume"));
    assert.equal(r.confidence, "low");
  });

  it("an abrupt start (a new or renamed article) is flagged", () => {
    const r = run("renamed", { views: (d) => (d >= "2025-03-01" ? 300 : 0) });
    assert.ok(codes(r).includes("abrupt_start"), JSON.stringify(codes(r)));
    assert.equal(r.confidence, "low");
  });

  it("bootstrap intervals are reproducible run to run", () => {
    const a = run("repro", { views: (d) => (isRecent(d) ? 230 : 200) * seasonal(d, 0.2) });
    const b = run("repro", { views: (d) => (isRecent(d) ? 230 : 200) * seasonal(d, 0.2) });
    assert.deepEqual(a.ci, b.ci);
  });
});
