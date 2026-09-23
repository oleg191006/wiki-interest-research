import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isIsoDate } from "./domain/calendar.ts";

export const VERSION = "0.1.0";

// Wikimedia's API rate limits (2026) give ~10 requests/min to clients without contact info
// in the User-Agent and 200 requests/min to clients that include an email or a full URL.
export const DEFAULT_CONTACT = "https://github.com/oleg191006/wiki-interest-research";

export interface Settings {
  version: string;
  skillDir: string;
  launcher: string;
  contact: string;
  userAgent: string;
  cacheDir: string;
  outputRoot: string;
  maxConcurrency: number;
  requestsPerMinute: number;
  fixedToday?: string;
  debug: boolean;
}

export function loadSettings(env: NodeJS.ProcessEnv = process.env): Settings {
  const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const contact = env.WIKI_SKILL_CONTACT?.trim() || DEFAULT_CONTACT;
  const today = env.WIKI_SKILL_TODAY?.trim();
  return {
    version: VERSION,
    skillDir,
    launcher: `node "${join(skillDir, "scripts", "wiki.mjs")}"`,
    contact,
    userAgent: `wiki-interest-research/${VERSION} (${contact}) node/${process.versions.node}`,
    cacheDir: env.WIKI_SKILL_CACHE?.trim() || join(homedir(), ".cache", "wiki-interest-research"),
    outputRoot: "wiki-interest-output",
    maxConcurrency: 3,
    requestsPerMinute: 150,
    fixedToday: today && isIsoDate(today) ? today : undefined,
    debug: Boolean(env.WIKI_SKILL_DEBUG),
  };
}
