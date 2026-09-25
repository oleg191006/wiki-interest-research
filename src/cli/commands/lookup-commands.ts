import type { FindTopic } from "../../application/find-topic.ts";
import type { RelatedArticles } from "../../application/related-articles.ts";
import { InputError } from "../../domain/errors.ts";
import { normalizeLang, parseLangs, type Lang } from "../../domain/languages/language.ts";
import type { LookupViews } from "../../presentation/text/lookup-views.ts";
import type { ParsedArgs } from "../args.ts";
import type { Command, Output } from "../command.ts";

function optionalLangs(args: ParsedArgs): Lang[] {
  const v = args.value("langs");
  return v ? parseLangs(v).langs : [];
}

export class FindCommand implements Command {
  readonly name = "find";
  private readonly useCase: FindTopic;
  private readonly views: LookupViews;
  private readonly launcher: string;
  private readonly output: Output;

  constructor(useCase: FindTopic, views: LookupViews, launcher: string, output: Output) {
    this.useCase = useCase;
    this.views = views;
    this.launcher = launcher;
    this.output = output;
  }

  async run(args: ParsedArgs): Promise<number> {
    const query = args.positional.join(" ").trim();
    if (!query)
      throw new InputError(
        "find needs a text to search for.",
        `Example: ${this.launcher} find "intermittent fasting" --langs pl,cs`,
      );
    const searchLang = normalizeLang(args.value("search-lang") ?? "en");
    const langs = optionalLangs(args);
    const result = await this.useCase.execute({
      query,
      searchLang,
      langs,
      limit: args.positiveInt("limit", 6),
    });
    this.output.print(this.views.find(result));
    return 0;
  }
}

export class RelatedCommand implements Command {
  readonly name = "related";
  private readonly useCase: RelatedArticles;
  private readonly views: LookupViews;
  private readonly launcher: string;
  private readonly output: Output;

  constructor(useCase: RelatedArticles, views: LookupViews, launcher: string, output: Output) {
    this.useCase = useCase;
    this.views = views;
    this.launcher = launcher;
    this.output = output;
  }

  async run(args: ParsedArgs): Promise<number> {
    const qid = (args.positional[0] ?? "").toUpperCase();
    if (!/^Q\d+$/.test(qid))
      throw new InputError(
        "related needs a QID.",
        `Example: ${this.launcher} related Q333 --langs uk`,
      );
    const sourceLang = normalizeLang(args.value("lang") ?? "en");
    const langs = optionalLangs(args);
    const result = await this.useCase.execute({
      qid,
      sourceLang,
      langs,
      limit: args.positiveInt("limit", 12),
    });
    this.output.print(this.views.related(result));
    return 0;
  }
}
