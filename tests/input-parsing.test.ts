import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTopic } from "../src/application/analyze/topic-spec.ts";
import { parseArgs } from "../src/cli/args.ts";
import { lastCompleteMonth } from "../src/domain/calendar.ts";
import { SkillError } from "../src/domain/errors.ts";
import { missingHomeCountries } from "../src/domain/languages/home-countries.ts";
import { parseLangs } from "../src/domain/languages/language.ts";
import { parseWeights } from "../src/domain/ranking/weights.ts";

describe("argument handling", () => {
  it("parses repeated flags, --flag=value and booleans", () => {
    const a = parseArgs(
      ["analyze", "--article", "A", "--article=B", "--lang", "pl,cs", "--offline"],
      "wiki",
    );
    assert.equal(a.command, "analyze");
    assert.deepEqual(a.values("article"), ["A", "B"]);
    assert.equal(a.value("lang"), "pl,cs");
    assert.ok(a.has("offline"));
  });

  it("rejects a flag that needs a value", () => {
    assert.throws(
      () => parseArgs(["analyze", "--lang"], "wiki"),
      (e: unknown) => e instanceof SkillError && /needs a value/.test(e.message),
    );
  });

  it("parses topic specs: QIDs, language-specific titles and free text", () => {
    assert.deepEqual(parseTopic("Astronomy=Q333,q544").items, [
      { kind: "qid", qid: "Q333" },
      { kind: "qid", qid: "Q544" },
    ]);
    assert.deepEqual(parseTopic("Fasting=Q1666254,pl:Głodówka lecznicza").items[1], {
      kind: "title",
      lang: "pl",
      title: "Głodówka lecznicza",
    });
    assert.deepEqual(parseTopic("intermittent fasting").items, [
      { kind: "query", text: "intermittent fasting" },
    ]);
  });

  it("normalizes ranking weights", () => {
    const w = parseWeights("growth=2,volume=1,share=1");
    assert.equal(w.growth, 0.5);
    assert.throws(() => parseWeights("speed=1"));
  });

  it("rejects country codes and suggests the language code", () => {
    assert.throws(
      () => parseLangs("ua"),
      (e: unknown) => e instanceof SkillError && /"uk"/.test(e.hint ?? ""),
    );
    assert.throws(
      () => parseLangs("cz"),
      (e: unknown) => e instanceof SkillError && /"cs"/.test(e.hint ?? ""),
    );
  });

  it("dedupes languages, keeps real editions that look like country codes and warns", () => {
    const { langs, warnings } = parseLangs("pl, cs,PL,si");
    assert.deepEqual(
      langs.map((l) => l.code),
      ["pl", "cs", "si"],
    );
    assert.equal(warnings.length, 1);
    assert.equal(parseLangs("be-tarask").langs[0].siteId, "be_x_oldwiki");
  });

  it("detects reader-country lists that omit the edition's home country", () => {
    assert.deepEqual(missingHomeCountries("tr", ["US", "DE", "NL"]), ["TR"]);
    assert.deepEqual(missingHomeCountries("de", ["DE", "AT", "CH"]), []);
    assert.equal(missingHomeCountries("eo", ["US"]), null);
  });

  it("uses only complete months with at least two days of data lag", () => {
    assert.equal(lastCompleteMonth("2026-09-22"), "2026-08");
    assert.equal(lastCompleteMonth("2026-09-01"), "2026-07");
    assert.equal(lastCompleteMonth("2026-09-02"), "2026-08");
  });
});
