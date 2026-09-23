import type { FileCache } from "../../infrastructure/cache/file-cache.ts";
import type { ParsedArgs } from "../args.ts";
import type { Command, Output } from "../command.ts";

export class CacheCommand implements Command {
  readonly name = "cache";
  private readonly cache: FileCache;
  private readonly output: Output;

  constructor(cache: FileCache, output: Output) {
    this.cache = cache;
    this.output = output;
  }

  async run(args: ParsedArgs): Promise<number> {
    if (args.has("clear")) {
      this.output.print(`Removed ${this.cache.clear()} cached responses from ${this.cache.dir}.`);
      return 0;
    }
    const { files, bytes } = this.cache.stats();
    const size = (bytes / 1024 / 1024).toFixed(1);
    this.output.print(
      `Cache ${this.cache.dir}: ${files} files, ${size} MB. Clear with: cache --clear`,
    );
    return 0;
  }
}
