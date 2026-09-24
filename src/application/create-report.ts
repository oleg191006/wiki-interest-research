import { join, resolve } from "node:path";
import { InputError } from "../domain/errors.ts";
import type { UiLang } from "../domain/languages/display-names.ts";
import type { AnalysisStore, RenderedReport, ReportRenderer, ReportText } from "./ports.ts";

export interface ReportRequest {
  runDir: string; // folder written by analyze
  ui: UiLang;
  text: ReportText;
  outFile?: string;
}

/** Use case "report": a one-page brief from a finished analysis plus the agent's own conclusions. */
export class CreateReport {
  private readonly store: AnalysisStore;
  private readonly renderer: ReportRenderer;

  constructor(store: AnalysisStore, renderer: ReportRenderer) {
    this.store = store;
    this.renderer = renderer;
  }

  async execute(req: ReportRequest): Promise<RenderedReport> {
    const analysis = this.store.load(req.runDir);
    if (!analysis.series.length) {
      throw new InputError(
        "The analysis has no measurable series (no articles found in the requested languages).",
        "Pick other items with find/related and re-run analyze.",
      );
    }
    const file = resolve(req.outFile ?? join(req.runDir, "report.pdf"));
    return this.renderer.render(analysis, req.ui, req.text, file);
  }
}
