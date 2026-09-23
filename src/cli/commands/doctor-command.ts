import { existsSync } from "node:fs";
import { join } from "node:path";
import { lastCompleteMonth } from "../../domain/calendar.ts";
import type { Clock } from "../../domain/clock.ts";
import { ExitCode } from "../../domain/errors.ts";
import type { FileCache } from "../../infrastructure/cache/file-cache.ts";
import type { PageviewsApi } from "../../infrastructure/wikimedia/pageviews-api.ts";
import type { Settings } from "../../settings.ts";
import type { ParsedArgs } from "../args.ts";
import type { Command, Output } from "../command.ts";

const DEPENDENCIES = ["tsx"];

export interface DoctorDeps {
  settings: Settings;
  cache: FileCache;
  pageviews: PageviewsApi;
  clock: Clock;
  output: Output;
}

export class DoctorCommand implements Command {
  readonly name = "doctor";
  private readonly deps: DoctorDeps;
  private ok = true;

  constructor(deps: DoctorDeps) {
    this.deps = deps;
  }

  async run(_args: ParsedArgs): Promise<number> {
    const { settings, output } = this.deps;
    this.ok = true;

    const [major, minor] = process.versions.node.split(".").map(Number);
    this.say(
      major > 20 || (major === 20 && minor >= 10),
      `Node ${process.versions.node} (need >= 20.10)`,
    );
    for (const dep of DEPENDENCIES) {
      this.say(existsSync(join(settings.skillDir, "node_modules", dep)), `dependency ${dep}`);
    }
    this.say(existsSync(join(settings.skillDir, "SKILL.md")), "SKILL.md is in place");
    this.sayCache();
    await this.sayNetwork();
    this.say(true, `User-Agent: ${settings.userAgent}`);

    output.print(
      this.ok
        ? "Ready."
        : `Fix the FAIL lines. Dependencies: npm ci --prefix "${settings.skillDir}"`,
    );
    return this.ok ? ExitCode.Ok : ExitCode.Environment;
  }

  private say(good: boolean, message: string): void {
    if (!good) this.ok = false;
    this.deps.output.print(`${good ? "OK  " : "FAIL"} ${message}`);
  }

  private sayCache(): void {
    const { cache } = this.deps;
    try {
      cache.set("doctor|probe", { at: Date.now() });
      const { files, bytes } = cache.stats();
      this.say(true, `cache ${cache.dir} (${files} files, ${(bytes / 1024).toFixed(0)} KB)`);
    } catch (error) {
      this.say(
        false,
        `cache ${cache.dir} is not writable (${String(error)}); ` +
          `set WIKI_SKILL_CACHE to a writable folder`,
      );
    }
  }

  private async sayNetwork(): Promise<void> {
    const month = lastCompleteMonth(this.deps.clock.today());
    try {
      const views = await this.deps.pageviews.editionDaily(
        "en.wikipedia.org",
        "all-access",
        `${month}-01`,
        `${month}-01`,
      );
      this.say(
        views[0] > 0,
        `Wikimedia Pageviews API reachable ` +
          `(en.wikipedia ${month}-01: ${views[0].toLocaleString("en-US")} views)`,
      );
    } catch (error) {
      const first = error instanceof Error ? error.message.split("\n")[0] : String(error);
      this.say(false, `network: ${first}`);
    }
  }
}
