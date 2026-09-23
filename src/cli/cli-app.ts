import { InputError } from "../domain/errors.ts";
import type { CacheMode } from "../infrastructure/http/cached-json-client.ts";
import { parseArgs } from "./args.ts";
import type { Command, Output } from "./command.ts";

export interface CliConfig {
  usage: string;
  launcher: string;
  output: Output;
  commands: (mode: CacheMode) => Command[];
}

export class CliApp {
  private readonly config: CliConfig;

  constructor(config: CliConfig) {
    this.config = config;
  }

  async run(argv: string[]): Promise<number> {
    const { usage, launcher, output } = this.config;
    const args = parseArgs(argv, launcher);

    if (!args.command || args.command === "help" || args.has("help")) {
      output.print(usage);
      return 0;
    }
    const commands = this.config.commands({
      offline: args.has("offline"),
      refresh: args.has("refresh"),
    });
    const command = commands.find((c) => c.name === args.command);
    if (!command) {
      throw new InputError(
        `Unknown command "${args.command}".`,
        `Commands: ${commands.map((c) => c.name).join(", ")}. See ${launcher} --help`,
      );
    }
    return command.run(args);
  }
}
