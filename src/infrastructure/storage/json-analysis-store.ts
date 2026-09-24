import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Analysis } from "../../application/analysis-model.ts";
import type { AnalysisStore } from "../../application/ports.ts";
import { InputError } from "../../domain/errors.ts";

const FILE = "analysis.json";

export class JsonAnalysisStore implements AnalysisStore {
  save(runDir: string, analysis: Analysis): void {
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, FILE), JSON.stringify(analysis, null, 1));
  }

  load(runDir: string): Analysis {
    const file = join(resolve(runDir), FILE);
    if (!existsSync(file)) {
      throw new InputError(
        `No ${FILE} in ${runDir}.`,
        "Run the analyze command first and pass its output folder to --run.",
      );
    }
    return JSON.parse(readFileSync(file, "utf8")) as Analysis;
  }
}
