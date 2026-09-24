import { existsSync, readFileSync } from "node:fs";
import type { CreateReport } from "../../application/create-report.ts";
import type { ReportText } from "../../application/ports.ts";
import { InputError } from "../../domain/errors.ts";
import { parseUiLang } from "../../domain/languages/display-names.ts";
import type { ParsedArgs } from "../args.ts";
import type { Command, Output } from "../command.ts";

/** report: one-page PDF from an analyze folder plus the agent's answer and recommendations. */
export class ReportCommand implements Command {
  readonly name = "report";
  private readonly useCase: CreateReport;
  private readonly output: Output;

  constructor(useCase: CreateReport, output: Output) {
    this.useCase = useCase;
    this.output = output;
  }

  async run(args: ParsedArgs): Promise<number> {
    const runDir = args.value("run") ?? args.positional[0];
    if (!runDir)
      throw new InputError(
        "report needs --run <folder of an analyze run>.",
        "The folder path is printed at the end of analyze output.",
      );
    const text = reportText(args);
    const ui = parseUiLang(args.value("lang") ?? args.value("ui-lang"));
    const res = await this.useCase.execute({ runDir, ui, text, outFile: args.value("out") });

    const scaled = res.scale < 1 ? `, text scaled to ${Math.round(res.scale * 100)}%` : "";
    const omitted = res.dropped.length ? `; omitted to fit: ${res.dropped.join(", ")}` : "";
    this.output.print(`PDF written: ${res.file} (1 page${scaled}${omitted}).`);
    if (!text.answer)
      this.output.print(
        "Note: no --answer given, so the PDF uses an auto-generated answer. Pass --answer to state the conclusion in the user's words.",
      );
    this.output.print(
      "Give the user this path. Charts (SVG) and data (CSV/JSON) are in the same folder.",
    );
    return 0;
  }
}

function reportText(args: ParsedArgs): ReportText {
  const text: ReportText = { recommendations: args.values("rec"), notes: args.values("note") };
  const file = args.value("text-file");
  if (file) {
    if (!existsSync(file)) throw new InputError(`--text-file ${file} not found.`);
    let j: any;
    try {
      j = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      throw new InputError(
        `--text-file ${file} is not valid JSON.`,
        'Expected {"title","question","answer","recommendations":[...],"notes":[...]}.',
      );
    }
    Object.assign(text, {
      title: j.title,
      question: j.question,
      answer: j.answer,
      recommendations: Array.isArray(j.recommendations)
        ? j.recommendations.map(String)
        : text.recommendations,
      notes: Array.isArray(j.notes) ? j.notes.map(String) : text.notes,
    });
  }
  text.title = args.value("title") ?? text.title;
  text.question = args.value("question") ?? text.question;
  text.answer = args.value("answer") ?? text.answer;
  return text;
}
