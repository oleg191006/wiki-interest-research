import { InputError } from "../domain/errors.ts";

const BOOL_FLAGS = new Set(["help", "clear", "offline", "refresh"]);

export class ParsedArgs {
  readonly argv: string[];
  readonly command: string;
  readonly positional: string[];
  private readonly flags: Map<string, string[]>;
  private readonly switches: Set<string>;

  constructor(
    argv: string[],
    command: string,
    positional: string[],
    flags: Map<string, string[]>,
    switches: Set<string>,
  ) {
    this.argv = argv;
    this.command = command;
    this.positional = positional;
    this.flags = flags;
    this.switches = switches;
  }

  /** Last value of a flag: a repeated flag overrides earlier ones. */
  value(name: string): string | undefined {
    return this.flags.get(name)?.at(-1);
  }

  /** All values of a repeatable flag (--topic, --rec, --note). */
  values(name: string): string[] {
    return this.flags.get(name) ?? [];
  }

  has(name: string): boolean {
    return this.switches.has(name);
  }

  positiveInt(name: string, fallback: number): number {
    const v = this.value(name);
    if (v === undefined) return fallback;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) {
      throw new InputError(`--${name} must be a positive number, got "${v}".`);
    }
    return Math.round(n);
  }
}

/** Accepts "--flag value", "--flag=value" and switches; the first bare word is the command. */
export function parseArgs(argv: string[], launcher: string): ParsedArgs {
  let command = "";
  const positional: string[] = [];
  const flags = new Map<string, string[]>();
  const switches = new Set<string>();

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      if (!command) command = a.toLowerCase();
      else positional.push(a);
      continue;
    }
    const eq = a.indexOf("=");
    const name = (eq > 0 ? a.slice(2, eq) : a.slice(2)).toLowerCase();
    if (BOOL_FLAGS.has(name) && eq < 0) {
      switches.add(name);
      continue;
    }
    let value = eq > 0 ? a.slice(eq + 1) : argv[i + 1];
    if (eq < 0) {
      if (value === undefined || value.startsWith("--")) {
        throw new InputError(`Option --${name} needs a value.`, `See: ${launcher} --help`);
      }
      i++;
    }
    flags.set(name, [...(flags.get(name) ?? []), value ?? ""]);
  }
  return new ParsedArgs(argv, command, positional, flags, switches);
}
