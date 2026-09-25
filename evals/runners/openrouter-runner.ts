import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import type { EvalCase } from "../lib/cases.ts";
import type { AgentRunner, RunOutcome } from "../lib/suite.ts";
import type { ToolCall, Transcript } from "../lib/transcript.ts";

export interface OpenRouterOptions {
  model: string;
  skillDir: string;
  baseUrl: string;
  apiKey: string;
  maxSteps: number;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Run a shell command in the working folder and return stdout+stderr.",
      parameters: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a UTF-8 text file.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write a UTF-8 text file.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
      },
    },
  },
];

const clip = (s: string, n = 12_000) =>
  s.length > n ? `${s.slice(0, n)}\n…[truncated ${s.length - n} chars]` : s;

/**
 * A minimal agent loop for any OpenAI-compatible chat model (OpenRouter by default), so the same
 * scenarios can be tried on cheap or free models. The model sees only the skill's name and
 * description, as in real skill discovery, and must read SKILL.md itself.
 */
export class OpenRouterRunner implements AgentRunner {
  readonly model: string;
  private readonly opts: OpenRouterOptions;
  private readonly description: string;

  constructor(opts: OpenRouterOptions) {
    this.opts = opts;
    this.model = opts.model;
    const skillMd = readFileSync(join(opts.skillDir, "SKILL.md"), "utf8");
    this.description = /^description: (.*)$/m.exec(skillMd)?.[1] ?? "";
  }

  async run(evalCase: EvalCase, caseDir: string): Promise<RunOutcome> {
    const toolCalls: ToolCall[] = [];
    const meta: Transcript["meta"] = { model: this.model, turns: 0, costUsd: 0 };
    const messages: any[] = [
      { role: "system", content: this.systemPrompt(caseDir) },
      { role: "user", content: evalCase.prompt },
    ];
    const started = Date.now();
    let finalText = "";
    try {
      finalText = await this.runTurn(messages, caseDir, 1, toolCalls, meta);
      if (evalCase.follow_up) {
        messages.push({ role: "user", content: evalCase.follow_up });
        finalText = await this.runTurn(messages, caseDir, 2, toolCalls, meta);
      }
    } catch (e) {
      meta.error = e instanceof Error ? e.message : String(e);
    }
    meta.durationMs = Date.now() - started;
    return {
      transcript: { toolCalls, finalText, meta },
      log: { file: "transcript.json", content: JSON.stringify(messages, null, 1) },
    };
  }

  private systemPrompt(cwd: string): string {
    return `You are a helpful agent working in the folder ${cwd} on ${process.platform}. You can run shell commands and read/write files.
Available skills (a skill is a folder with instructions and tools; read its SKILL.md before using it):
- wiki-interest-research: ${this.description}
  Base directory: ${this.opts.skillDir}  (instructions: ${join(this.opts.skillDir, "SKILL.md")}; in its commands, SKILL means this base directory)
When the user's task matches a skill, read its SKILL.md first and follow it. Answer in the user's language.`;
  }

  private async runTurn(
    messages: any[],
    cwd: string,
    turn: number,
    calls: ToolCall[],
    meta: Transcript["meta"],
  ): Promise<string> {
    for (let step = 0; step < this.opts.maxSteps; step++) {
      const j = await this.chat(messages);
      const msg = j.choices?.[0]?.message ?? {};
      meta.turns = (meta.turns ?? 0) + 1;
      meta.costUsd = (meta.costUsd ?? 0) + (j.usage?.cost ?? 0);
      messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });
      if (!msg.tool_calls?.length) return String(msg.content ?? "");
      for (const tc of msg.tool_calls) {
        let input: any = {};
        try {
          input = JSON.parse(tc.function.arguments || "{}");
        } catch {
          /* keep empty */
        }
        calls.push({ name: tc.function.name, input, turn });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: execTool(tc.function.name, input, cwd),
        });
      }
    }
    return "[stopped: step limit]";
  }

  private async chat(messages: any[]): Promise<any> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await fetch(`${this.opts.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.opts.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 0.2,
        }),
      });
      if (r.status === 429 || r.status >= 500) {
        await new Promise((res) => setTimeout(res, 5000 * (attempt + 1)));
        continue;
      }
      const j: any = await r.json();
      if (!r.ok || j.error)
        throw new Error(`API error ${r.status}: ${JSON.stringify(j.error ?? j).slice(0, 300)}`);
      return j;
    }
    throw new Error("API kept returning 429/5xx");
  }
}

function execTool(name: string, input: any, cwd: string): string {
  try {
    if (name === "run_command") {
      const r = spawnSync(String(input.command), {
        cwd,
        shell: true,
        encoding: "utf8",
        timeout: 10 * 60_000,
        maxBuffer: 64 * 1024 * 1024,
      });
      return clip(
        `exit ${r.status}\n${r.stdout ?? ""}${r.stderr ? `\n[stderr]\n${r.stderr}` : ""}`,
      );
    }
    const p = isAbsolute(String(input.path)) ? String(input.path) : join(cwd, String(input.path));
    if (name === "read_file") return clip(readFileSync(p, "utf8"), 20_000);
    if (name === "write_file") {
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, String(input.content ?? ""));
      return `wrote ${p}`;
    }
    return `unknown tool ${name}`;
  } catch (e) {
    return `error: ${e instanceof Error ? e.message : String(e)}`;
  }
}
