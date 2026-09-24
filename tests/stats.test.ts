import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  median,
  pairedBootstrap,
  quantile,
  rollingMedian,
  signTestP,
} from "../src/domain/stats.ts";

describe("stats", () => {
  it("quantile and median interpolate linearly", () => {
    assert.equal(median([3, 1, 2]), 2);
    assert.equal(median([1, 2, 3, 4]), 2.5);
    assert.equal(quantile([0, 10], 0.25), 2.5);
  });

  it("rolling median ignores a single outlier", () => {
    const r = rollingMedian([1, 1, 1, 100, 1, 1, 1], 2);
    assert.deepEqual(r, [1, 1, 1, 1, 1, 1, 1]);
  });

  it("sign test matches the binomial distribution", () => {
    assert.equal(signTestP(6, 12), 1);
    assert.ok(Math.abs(signTestP(12, 12) - 2 / 4096) < 1e-12);
    assert.ok(Math.abs(signTestP(10, 12) - (2 * (1 + 12 + 66)) / 4096) < 1e-12);
  });

  it("paired bootstrap collapses to the point estimate when every month grows equally", () => {
    const base = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];
    const recent = base.map((v) => v * 1.2);
    const proj = base.map(() => 1000);
    const b = pairedBootstrap(recent, base, proj, proj, 1);
    assert.ok(Math.abs(b.low - 0.2) < 1e-9 && Math.abs(b.high - 0.2) < 1e-9);
  });
});
