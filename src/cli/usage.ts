import type { Settings } from "../settings.ts";

export function usage(s: Settings): string {
  return `wiki-interest-research ${s.version}: public interest in topics from Wikipedia pageviews

Usage: ${s.launcher} <command> [options]

  doctor              Check Node, dependencies and the skill folder.

Commands still being built: find, related, analyze, report, cache.`;
}
