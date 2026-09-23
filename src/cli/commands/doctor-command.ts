import { existsSync } from "node:fs";
import { join } from "node:path";
import { ExitCode } from "../../domain/errors.ts";
import type { Settings } from "../../settings.ts";
import type { ParsedArgs } from "../args.ts";
import type { Command, Output } from "../command.ts";

const DEPENDENCIES = ["tsx"];

export class DoctorCommand implements Command {
  readonly name = "doctor";
  private readonly settings: Settings;
  private readonly output: Output;

  constructor(settings: Settings, output: Output) {
    this.settings = settings;
    this.output = output;
  }

  async run(_args: ParsedArgs): Promise<number> {
    let ok = true;
    const say = (good: boolean, message: string) => {
      if (!good) ok = false;
      this.output.print(`${good ? "OK  " : "FAIL"} ${message}`);
    };

    const [major, minor] = process.versions.node.split(".").map(Number);
    say(
      major > 20 || (major === 20 && minor >= 10),
      `Node ${process.versions.node} (need >= 20.10)`,
    );
    for (const dep of DEPENDENCIES) {
      say(existsSync(join(this.settings.skillDir, "node_modules", dep)), `dependency ${dep}`);
    }
    say(existsSync(join(this.settings.skillDir, "SKILL.md")), "SKILL.md is in place");
    say(true, `User-Agent: ${this.settings.userAgent}`);

    this.output.print(
      ok
        ? "Ready."
        : `Fix the FAIL lines. Dependencies: npm ci --prefix "${this.settings.skillDir}"`,
    );
    return ok ? ExitCode.Ok : ExitCode.Environment;
  }
}
