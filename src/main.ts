import { ConsoleOutput } from "./cli/command.ts";
import { createCli } from "./composition-root.ts";
import { SkillError } from "./domain/errors.ts";
import { loadSettings } from "./settings.ts";


const output = new ConsoleOutput();
try {
  process.exitCode = await createCli(loadSettings(), output).run(process.argv.slice(2));
} catch (err) {
  if (err instanceof SkillError) {
    output.error(`Error: ${err.message}${err.hint ? `\nHint: ${err.hint}` : ""}`);
    process.exitCode = err.exitCode;
  } else {
    output.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
    process.exitCode = 1;
  }
}
