import type { ParsedArgs } from "./args.ts";

export interface Command {
  readonly name: string;
  run(args: ParsedArgs): Promise<number>;
}

export interface Output {
  print(text: string): void;
  log(text: string): void;
  error(text: string): void;
}

export class ConsoleOutput implements Output {
  print(text: string): void {
    console.log(text);
  }

  log(text: string): void {
    process.stderr.write(`${text}\n`);
  }

  error(text: string): void {
    console.error(text);
  }
}
