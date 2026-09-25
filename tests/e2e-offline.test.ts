import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(join(tmpdir(), "wiki-e2e-"));
cpSync(join(root, "tests", "fixtures", "cache"), join(work, "cache"), { recursive: true });
const env = {
  ...process.env,
  WIKI_SKILL_CACHE: join(work, "cache"),
  WIKI_SKILL_TODAY: "2026-09-22",
};
const cli = (...args: string[]) =>
  execFileSync(process.execPath, [join(root, "scripts", "wiki.mjs"), ...args], {
    env,
    encoding: "utf8",
  });

describe("offline end-to-end run on recorded data (uk: Астрономія, Sep 2024 – Aug 2026)", () => {
  const out = join(work, "run");
  const summary = cli(
    "analyze",
    "--topic",
    "Астрономія=Q333",
    "--langs",
    "uk",
    "--offline",
    "--out",
    out,
  );
  const a = JSON.parse(readFileSync(join(out, "analysis.json"), "utf8"));
  const s = a.series[0];

  it("reproduces the known numbers", () => {
    assert.equal(a.windows.recentMonths[0], "2025-09");
    assert.equal(a.windows.baselineMonths[0], "2024-09");
    assert.equal(s.monthly.length, 24);
    assert.ok(Math.abs(s.growth - -0.596) < 0.01, `growth ${s.growth}`);
    assert.equal(s.monthsUp, 1);
    assert.equal(s.verdict, "falling");
  });

  it("writes the agent summary, CSVs and charts", () => {
    assert.match(summary, /## Key findings/);
    assert.match(summary, /falling/);
    for (const f of [
      "summary.md",
      "monthly.csv",
      "daily.csv",
      "chart_trend.svg",
      "chart_growth.svg",
      "chart_daily.svg",
    ]) {
      assert.ok(existsSync(join(out, f)), f);
    }
  });

  it("renders a one-page PDF even with very long texts", () => {
    const long = "Дуже довгий текст рекомендації, який повторюється багато разів. ".repeat(12);
    const msg = cli(
      "report",
      "--run",
      out,
      "--lang",
      "uk",
      "--question",
      long,
      "--answer",
      long,
      "--rec",
      long,
      "--rec",
      long,
      "--rec",
      long,
      "--note",
      long,
    );
    assert.match(msg, /1 page/);
    const pdf = readFileSync(join(out, "report.pdf"), "latin1");
    const pages = pdf.match(/\/Type\s*\/Page(?!s)/g) ?? [];
    assert.equal(pages.length, 1);
  });
});
