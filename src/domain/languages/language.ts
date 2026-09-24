import { InputError } from "../errors.ts";
import { languageName } from "./display-names.ts";

export interface Lang {
  code: string;
  project: string;
  siteId: string;
}

const NOT_A_WIKIPEDIA: Record<string, string> = {
  ua: "uk",
  cz: "cs",
  gr: "el",
  jp: "ja",
  dk: "da",
  cn: "zh",
  kr: "ko",
  by: "be",
  rs: "sr",
  il: "he",
  ir: "fa",
  vn: "vi",
  gb: "en",
  us: "en",
  at: "de",
  mx: "es",
  kz: "kk",
  ge: "ka",
  al: "sq",
};

// Real Wikipedia editions whose code is also a country code: allowed, but worth a warning.
const AMBIGUOUS: Record<string, string> = {
  si: "si = Sinhala Wikipedia (Slovenian is sl)",
  se: "se = Northern Sami Wikipedia (Swedish is sv)",
  ee: "ee = Ewe Wikipedia (Estonian is et)",
  br: "br = Breton Wikipedia (Portuguese is pt)",
  ch: "ch = Chamorro Wikipedia (German is de)",
  am: "am = Amharic Wikipedia (Armenian is hy)",
};

const ALIASES: Record<string, string> = { nb: "no" };
const SPECIAL_SITE_IDS: Record<string, string> = { "be-tarask": "be_x_oldwiki" };

export function parseLangs(input: string | undefined): { langs: Lang[]; warnings: string[] } {
  if (!input || !input.trim()) {
    throw new InputError(
      "No languages given.",
      "Pass Wikipedia language codes, e.g. --langs uk or --langs pl,cs,sk",
    );
  }
  const warnings: string[] = [];
  const langs: Lang[] = [];
  for (const raw of input.split(/[,\s]+/).filter(Boolean)) {
    const code = normalizeLang(raw);
    if (langs.some((l) => l.code === code)) continue;
    if (AMBIGUOUS[code]) warnings.push(`Language code check: ${AMBIGUOUS[code]}.`);
    langs.push(toLang(code));
  }
  return { langs, warnings };
}

export function normalizeLang(raw: string): string {
  let code = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\.wikipedia(\.org)?\/?$/, "");
  code = ALIASES[code] ?? code;
  const fix = NOT_A_WIKIPEDIA[code];
  if (fix) {
    throw new InputError(
      `"${raw}" looks like a country code, not a Wikipedia language code.`,
      `Did you mean "${fix}" (${languageName(fix, "en")})? Codes are Wikipedia subdomains: ` +
        `uk=Ukrainian, cs=Czech, pl=Polish, en=English.`,
    );
  }
  if (!/^(simple|[a-z]{2,3}(-[a-z]{2,8})*)$/.test(code)) {
    throw new InputError(
      `"${raw}" is not a valid Wikipedia language code.`,
      "Examples: en, uk, pl, cs, de, pt, zh, be-tarask.",
    );
  }
  return code;
}

export function toLang(code: string): Lang {
  return {
    code,
    project: `${code}.wikipedia.org`,
    siteId: SPECIAL_SITE_IDS[code] ?? `${code.replaceAll("-", "_")}wiki`,
  };
}
