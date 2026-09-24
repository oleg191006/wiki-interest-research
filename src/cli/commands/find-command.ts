import type { Entity, PageInfo } from "../../application/wiki-types.ts";
import { wikipediaCount } from "../../application/wiki-types.ts";
import { InputError } from "../../domain/errors.ts";
import type { Lang } from "../../domain/languages/language.ts";
import { parseLangs } from "../../domain/languages/language.ts";
import type { WikidataApi } from "../../infrastructure/wikimedia/wikidata-api.ts";
import type { WikipediaApi } from "../../infrastructure/wikimedia/wikipedia-api.ts";
import type { ParsedArgs } from "../args.ts";
import type { Command, Output } from "../command.ts";

export interface FindDeps {
  catalog: WikidataApi;
  directory: WikipediaApi;
  launcher: string;
  output: Output;
}

export class FindCommand implements Command {
  readonly name = "find";
  private readonly deps: FindDeps;

  constructor(deps: FindDeps) {
    this.deps = deps;
  }

  async run(args: ParsedArgs): Promise<number> {
    const { catalog, launcher, output } = this.deps;
    const query = args.value("query") ?? args.positional.join(" ");
    if (!query) {
      throw new InputError(
        "A topic to search for is required.",
        `Example: ${launcher} find "інтервальне голодування" --lang uk,pl`,
      );
    }
    const { langs, warnings } = parseLangs(args.value("lang") ?? "en");
    for (const w of warnings) output.log(w);

    const hits = await catalog.search(query, langs[0].code, args.positiveInt("limit", 5));
    if (!hits.length) {
      throw new InputError(
        `Wikidata found nothing for "${query}" in ${langs[0].code}.`,
        "Try the topic's name in another language, or a broader wording.",
      );
    }
    const entities = await catalog.entities(
      hits.map((h) => h.qid),
      langs.map((l) => l.code),
    );

    const lines = [`Wikidata matches for "${query}" (search language: ${langs[0].code})`, ``];
    for (const hit of hits) {
      const entity = entities.get(hit.qid);
      lines.push(`${hit.qid}  ${hit.label}${hit.description ? ` — ${hit.description}` : ""}`);
      lines.push(`    in ${entity ? wikipediaCount(entity) : 0} Wikipedia editions`);
      lines.push(...(await this.editionLines(entity, langs)));
      lines.push(``);
    }
    lines.push(`Next: ${launcher} analyze --article "<title>" --lang <code>`);
    output.print(lines.join("\n"));
    return 0;
  }

  private async editionLines(entity: Entity | undefined, langs: Lang[]): Promise<string[]> {
    const lines: string[] = [];
    for (const lang of langs) {
      const title = entity?.sitelinks[lang.siteId];
      if (!title) {
        lines.push(`    ${lang.code}: no article`);
        continue;
      }
      const page = await this.deps.directory.pageInfo(lang.code, title);
      lines.push(`    ${lang.code}: ${page.title}${describe(page)}`);
    }
    return lines;
  }
}

function describe(p: PageInfo): string {
  const notes: string[] = [];
  if (p.redirectedFrom) notes.push(`redirect from "${p.redirectedFrom}"`);
  if (p.disambiguation) notes.push("DISAMBIGUATION page, pick a specific article");
  if (p.created) notes.push(`created ${p.created}`);
  if (p.views60 !== undefined) notes.push(`${Math.round(p.views60 / 60)} views/day`);
  return notes.length ? ` (${notes.join(", ")})` : "";
}
