import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AnalyzeTopics } from "../src/application/analyze/analyze-topics.ts";
import type { ArticleDirectory, EntityCatalog, PageviewSource } from "../src/application/ports.ts";
import type {
  Access,
  CountryShare,
  Entity,
  PageInfo,
  RedirectStats,
  SearchHit,
  SearchResultPage,
} from "../src/application/wiki-types.ts";
import { eachDay } from "../src/domain/calendar.ts";
import { FixedClock } from "../src/domain/clock.ts";
import { SkillError } from "../src/domain/errors.ts";
import type { Lang } from "../src/domain/languages/language.ts";

const TODAY = "2026-09-22";

class FakeCatalog implements EntityCatalog {
  async search(query: string): Promise<SearchHit[]> {
    return [{ qid: "Q1", label: query, description: "a topic" }];
  }

  async entities(qids: string[]): Promise<Map<string, Entity>> {
    const out = new Map<string, Entity>();
    for (const qid of qids) {
      out.set(qid, {
        qid,
        labels: { en: "Fasting" },
        descriptions: {},
        sitelinks: { cswiki: "Půst", enwiki: "Fasting" },
      });
    }
    return out;
  }
}

class FakeDirectory implements ArticleDirectory {
  async pageInfo(lang: string, title: string): Promise<PageInfo> {
    return {
      lang,
      requested: title,
      title,
      exists: true,
      disambiguation: false,
      created: "2010-01-01",
      views60: 600,
    };
  }

  async redirectViews(): Promise<RedirectStats> {
    return { count: 0, views60: 0, top: [] };
  }

  async search(): Promise<SearchResultPage[]> {
    return [];
  }
}

class FakePageviews implements PageviewSource {
  async articleDaily(
    _lang: Lang,
    _title: string,
    access: Access,
    start: string,
    end: string,
  ): Promise<number[]> {
    const factor = access === "desktop" ? 0.3 : 1;
    return eachDay(start, end).map((d) => Math.round((d >= "2025-09-01" ? 200 : 100) * factor));
  }

  async editionDaily(_lang: Lang, access: Access, start: string, end: string): Promise<number[]> {
    return eachDay(start, end).map(() => (access === "desktop" ? 300_000 : 1_000_000));
  }

  async uniqueDevices(): Promise<Record<string, number>> {
    return { "2026-08": 1_000_000 };
  }

  async topCountries(): Promise<CountryShare[]> {
    return [{ country: "CZ", share: 0.8 }];
  }

  verificationUrl(lang: Lang, titles: string[]): string {
    return `https://pageviews.wmcloud.org/?project=${lang.project}&pages=${titles.join("|")}`;
  }
}

function useCase(): AnalyzeTopics {
  return new AnalyzeTopics({
    catalog: new FakeCatalog(),
    directory: new FakeDirectory(),
    pageviews: new FakePageviews(),
    clock: new FixedClock(TODAY),
    version: "test",
    log: () => {},
  });
}

const request = {
  topics: ["Fasting=Q1"],
  langs: "cs,pl",
  months: 24,
  window: 12,
  searchLang: "en",
  redirects: true,
  uiLang: "en" as const,
  command: "analyze (test)",
};

describe("analyze use case with fake data sources", () => {
  it("measures the language that has the article and reports the one that does not", async () => {
    const a = await useCase().execute(request);

    assert.equal(a.series.length, 1, "only Czech can be measured");
    assert.equal(a.series[0].lang, "cs");
    assert.equal(a.series[0].verdict, "rising");
    assert.ok(Math.abs(a.series[0].growth! - 1) < 0.02, `doubled views: ${a.series[0].growth}`);
    assert.deepEqual(
      Object.keys(a.verify),
      ["cs"],
      "no verification link for a language without articles",
    );
    assert.ok(
      a.notes.some((n) => /^pl: no article/.test(n)),
      a.notes.join(" | "),
    );
    assert.ok(a.topics[0].missing.pl.length > 0);
  });

  it("uses complete months only and records how it was produced", async () => {
    const a = await useCase().execute(request);

    assert.equal(a.windows.months.at(-1), "2026-08");
    assert.equal(a.windows.recentMonths[0], "2025-09");
    assert.equal(a.windows.baselineMonths[0], "2024-09");
    assert.equal(a.generated, TODAY);
    assert.equal(a.command, "analyze (test)");
  });

  it("refuses more series than one run should download", async () => {
    const many = { ...request, topics: ["A=Q1", "B=Q1", "C=Q1"], langs: "cs,pl,de,fr" };
    await assert.rejects(
      () => useCase().execute(many),
      (e: unknown) => e instanceof SkillError && /limit per run is 10/.test(e.message),
    );
  });
});
