export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  turn: number;
}

export interface RunMeta {
  model: string;
  turns?: number;
  costUsd?: number;
  durationMs?: number;
  error?: string;
}

export interface Transcript {
  toolCalls: ToolCall[];
  finalText: string;
  meta: RunMeta;
}

export const commandOf = (c: ToolCall): string => String(c.input.command ?? c.input.cmd ?? "");

export const isShell = (c: ToolCall): boolean => /^(Bash|PowerShell|run_command)$/.test(c.name);
