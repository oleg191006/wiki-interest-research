import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { CHECKS, gradeContext } from "../evals/lib/checks.ts";
import type { Transcript } from "../evals/lib/transcript.ts";

const SUMMARY = "| Czech (cs) | 150 | −54% [−63%…−43%] | −52% | −51% | 1/12 | falling | low |\n";

function context(answer: string) {
  const dir = mkdtempSync(join(tmpdir(), "wiki-grade-"));
  writeFileSync(join(dir, "summary.md"), SUMMARY);
  const transcript: Transcript = { toolCalls: [], finalText: answer, meta: { model: "test" } };
  return gradeContext(transcript, dir, Date.now());
}

describe("eval checks", () => {
  it("accepts percentages that appear in the tool output", () => {
    const r = CHECKS.numbers_grounded(
      context("Інтерес спадає: −54% р/р (інтервал −63%…−43%), впевненість низька."),
    );
    assert.ok(r.passed, r.evidence);
  });

  it("rejects a percentage the model never saw", () => {
    const r = CHECKS.numbers_grounded(context("Інтерес спадає на −54%, а точність оцінки ±15%."));
    assert.equal(r.passed, false);
    assert.match(r.evidence, /15/);
  });

  it("fails when no analysis was produced at all", () => {
    const dir = mkdtempSync(join(tmpdir(), "wiki-grade-empty-"));
    const ctx = gradeContext(
      { toolCalls: [], finalText: "Інтерес зростає на 30%.", meta: { model: "test" } },
      dir,
      Date.now(),
    );
    assert.equal(CHECKS.numbers_grounded(ctx).passed, false);
  });

  it("notices when a missing Polish article is reported", () => {
    assert.ok(
      CHECKS.mentions_missing_pl(
        context("У польській Вікіпедії статті немає, тому виміряти неможливо."),
      ).passed,
    );
    assert.equal(
      CHECKS.mentions_missing_pl(context("У польській Вікіпедії інтерес зростає.")).passed,
      false,
    );
  });
});
