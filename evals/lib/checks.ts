import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { commandOf, isShell, type Transcript } from "./transcript.ts";

export interface CheckResult {
  text: string;
  passed: boolean;
  evidence: string;
}

export interface GradeContext {
  transcript: Transcript;
  caseDir: string;
  startedAt: number;
  files: string[];
  summaries: string[];
  analyses: string[];
  shell: string[];
  answer: string;
}

export type Check = (ctx: GradeContext) => CheckResult;

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === ".claude" || name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

export function gradeContext(t: Transcript, caseDir: string, startedAt: number): GradeContext {
  const files = walk(caseDir);
  return {
    transcript: t,
    caseDir,
    startedAt,
    files,
    summaries: files.filter((f) => f.endsWith("summary.md")).map((f) => readFileSync(f, "utf8")),
    analyses: files.filter((f) => f.endsWith("analysis.json")).map((f) => readFileSync(f, "utf8")),
    shell: t.toolCalls.filter(isShell).map(commandOf),
    answer: t.finalText,
  };
}

const result = (text: string, passed: boolean, evidence: string): CheckResult => ({
  text,
  passed,
  evidence,
});

export function percentages(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s?%/g)) out.push(Number(m[1].replace(",", ".")));
  return out;
}

function groundedPercentages(ctx: GradeContext): Set<number> {
  const allowed = new Set<number>([95, 100, 5, 10, 2.5, 97.5]);
  for (const v of percentages(ctx.summaries.join("\n"))) allowed.add(v);
  const addFraction = (x: unknown) => {
    if (typeof x !== "number" || !Number.isFinite(x)) return;
    const p = Math.abs(x * 100);
    allowed.add(Math.round(p));
    allowed.add(Math.round(p * 10) / 10);
  };
  for (const raw of ctx.analyses) {
    const a = JSON.parse(raw);
    for (const s of a.series ?? []) {
      [
        s.growth,
        s.growthDespiked,
        s.normalizedGrowth,
        s.projectGrowth,
        s.growthMedianDay,
        s.spikeShareRecent,
        ...(s.ci ?? []),
        ...(s.normCi ?? []),
      ].forEach(addFraction);
      [s.recent?.desktopShare, s.baseline?.desktopShare].forEach(addFraction);
    }
    for (const e of Object.values(a.editions ?? {}) as any[]) {
      addFraction(e.growth);
      for (const c of e.topCountries ?? []) addFraction(c.share);
    }
    for (const r of a.ranking ?? []) addFraction(r.inputs?.conservativeGrowth);
  }
  return allowed;
}

export const CHECKS: Record<string, Check> = {
  skill_used: (ctx) => {
    const skill = ctx.transcript.toolCalls.find(
      (c) => c.name === "Skill" && JSON.stringify(c.input).includes("wiki-interest-research"),
    );
    const read = ctx.transcript.toolCalls.find(
      (c) => /read/i.test(c.name) && JSON.stringify(c.input).includes("SKILL.md"),
    );
    return result(
      "skill_used: the agent loaded the skill",
      Boolean(skill || read),
      skill ? "Skill tool call" : read ? "read SKILL.md" : "no Skill call or SKILL.md read",
    );
  },

  skill_not_used: (ctx) => {
    const used = ctx.transcript.toolCalls.some(
      (c) =>
        (c.name === "Skill" && JSON.stringify(c.input).includes("wiki-interest-research")) ||
        commandOf(c).includes("wiki.mjs"),
    );
    return result(
      "skill_not_used: a near-miss request does not trigger the skill",
      !used,
      used ? "skill was used" : "not used",
    );
  },

  cli_analyze: (ctx) => {
    const cmd = ctx.shell.find((c) => c.includes("wiki.mjs") && /\banalyze\b/.test(c));
    return result(
      "cli_analyze: ran the bundled analyze command",
      Boolean(cmd),
      cmd ? cmd.slice(0, 200) : `shell commands: ${ctx.shell.length}`,
    );
  },

  no_custom_code: (ctx) => {
    const written = ctx.transcript.toolCalls.filter(
      (c) =>
        /write/i.test(c.name) &&
        /\.(py|js|ts|mjs|cjs|ipynb)$/i.test(String(c.input.file_path ?? c.input.path ?? "")),
    );
    const adhoc = ctx.shell.filter((c) =>
      /(python3?|py)\s+-c|node\s+-e|curl\s|wget\s|Invoke-WebRequest|urllib|requests\.get/i.test(c),
    );
    return result(
      "no_custom_code: no hand-written analysis code or manual API calls",
      written.length === 0 && adhoc.length === 0,
      written.length || adhoc.length
        ? [
            ...written.map((c) => String(c.input.file_path ?? c.input.path)),
            ...adhoc.map((c) => c.slice(0, 120)),
          ].join(" | ")
        : "none",
    );
  },

  numbers_grounded: (ctx) => {
    const allowed = groundedPercentages(ctx);
    const claimed = percentages(ctx.answer);
    const bad = claimed.filter((v) => ![...allowed].some((a) => Math.abs(a - v) < 0.051));
    return result(
      "numbers_grounded: every % in the answer appears in the tool output",
      ctx.summaries.length > 0 && bad.length === 0,
      ctx.summaries.length === 0
        ? "no summary.md produced"
        : bad.length
          ? `not found in outputs: ${bad.join(", ")}%`
          : `${claimed.length} percentages checked`,
    );
  },

  mentions_confidence: (ctx) =>
    result(
      "mentions_confidence: states how reliable the result is",
      /впевнен|довір|надійн|confidence|reliab|trust/i.test(ctx.answer),
      ctx.answer.slice(0, 160),
    ),

  mentions_platform: (ctx) =>
    result(
      "mentions_platform: separates topic trend from the whole edition's traffic",
      /(вс(ього|ієї|ю|я|ім|іє)|усі(м|єї|ього)|загальн\w*)\s+(укр\w*\s+)?(розділ|вікіпед|трафік|видан|wikipedi)|whole edition|platform|платформ|відносно (всього |усього )?(розділу|видання)/i.test(
        ctx.answer,
      ),
      ctx.answer.slice(0, 160),
    ),

  mentions_missing_pl: (ctx) =>
    result(
      "mentions_missing_pl: says Polish Wikipedia has no article (no silent substitute)",
      /(польськ|polish|\bpl\b)[\s\S]{0,160}(немає|відсутн|no article|missing|не існує|нема|cannot|неможливо)|(немає|відсутн|no article|missing)[\s\S]{0,80}(польськ|polish|\bpl\b)/i.test(
        ctx.answer,
      ),
      ctx.answer.slice(0, 200),
    ),

  pdf_created: (ctx) => {
    const pdfs = ctx.files.filter(
      (f) => f.endsWith(".pdf") && statSync(f).mtimeMs >= ctx.startedAt,
    );
    return result(
      "pdf_created: a PDF brief was produced",
      pdfs.length > 0,
      pdfs.join(", ") || "no PDF",
    );
  },

  rerun_with_changes: (ctx) => {
    const second = ctx.transcript.toolCalls
      .filter((c) => c.turn === 2 && isShell(c))
      .map(commandOf);
    const cmd = second.find((c) => c.includes("analyze") && /\bde\b/.test(c) && /36/.test(c));
    return result(
      "rerun_with_changes: follow-up re-ran analyze with de and 36 months",
      Boolean(cmd),
      cmd ? cmd.slice(0, 200) : `turn-2 commands: ${second.length}`,
    );
  },
};
