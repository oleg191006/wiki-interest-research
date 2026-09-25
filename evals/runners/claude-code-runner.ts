import { spawnSync } from "node:child_process";
import { mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import type { EvalCase } from "../lib/cases.ts";
import type { AgentRunner, RunOutcome } from "../lib/suite.ts";
import type { ToolCall, Transcript } from "../lib/transcript.ts";

const ALLOWED_TOOLS = [
  "Skill",
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep",
  "Bash(node:*)",
  "Bash(npm:*)",
  "Bash(cat:*)",
  "Bash(ls:*)",
  "PowerShell(node:*)",
  "PowerShell(npm:*)",
];

export interface ClaudeCodeOptions {
  model: string;
  skillDir: string;
  binary: string;
}

export class ClaudeCodeRunner implements AgentRunner {
  readonly model: string;
  private readonly opts: ClaudeCodeOptions;

  constructor(opts: ClaudeCodeOptions) {
    this.opts = opts;
    this.model = opts.model;
  }

  prepare(caseDir: string): void {
    mkdirSync(join(caseDir, ".claude", "skills"), { recursive: true });
    symlinkSync(
      this.opts.skillDir,
      join(caseDir, ".claude", "skills", "wiki-interest-research"),
      process.platform === "win32" ? "junction" : "dir",
    );
  }

  async run(evalCase: EvalCase, caseDir: string): Promise<RunOutcome> {
    const first = this.invoke(caseDir, evalCase.prompt, false);
    const turns = [first.events];
    let raw = first.raw;
    if (evalCase.follow_up) {
      const second = this.invoke(caseDir, evalCase.follow_up, true);
      turns.push(second.events);
      raw += `\n#follow-up\n${second.raw}`;
    }
    return {
      transcript: this.toTranscript(turns),
      log: { file: "transcript.jsonl", content: raw },
    };
  }

  private invoke(cwd: string, prompt: string, isFollowUp: boolean): { events: any[]; raw: string } {
    const args = [
      "-p",
      prompt,
      "--model",
      this.model,
      "--output-format",
      "stream-json",
      "--verbose",
      "--max-turns",
      "40",
    ];
    if (isFollowUp) args.push("--continue");
    args.push("--allowedTools", ...ALLOWED_TOOLS);
    const r = spawnSync(this.opts.binary, args, {
      cwd,
      encoding: "utf8",
      timeout: 15 * 60_000,
      maxBuffer: 256 * 1024 * 1024,
    });
    const raw = (r.stdout ?? "") + (r.stderr ? `\n#stderr\n${r.stderr}` : "");
    const events = (r.stdout ?? "")
      .split("\n")
      .filter((l) => l.trim().startsWith("{"))
      .map((l) => JSON.parse(l));
    return { events, raw };
  }

  private toTranscript(turns: any[][]): Transcript {
    const toolCalls: ToolCall[] = [];
    let finalText = "";
    const meta: Transcript["meta"] = { model: this.model, turns: 0, costUsd: 0, durationMs: 0 };
    turns.forEach((events, k) => {
      for (const ev of events) {
        if (ev.type === "assistant") {
          for (const block of ev.message?.content ?? []) {
            if (block.type === "tool_use")
              toolCalls.push({ name: block.name, input: block.input ?? {}, turn: k + 1 });
          }
        }
        if (ev.type === "result") {
          finalText = String(ev.result ?? finalText);
          meta.turns! += ev.num_turns ?? 0;
          meta.costUsd! += ev.total_cost_usd ?? 0;
          meta.durationMs! += ev.duration_ms ?? 0;
          if (ev.subtype !== "success") meta.error = ev.subtype;
        }
      }
    });
    return { toolCalls, finalText, meta };
  }
}
