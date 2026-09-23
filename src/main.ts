import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "0.1.0";
const LAUNCHER = `node "${join(SKILL_DIR, "scripts", "wiki.mjs")}"`;

const USAGE = `wiki-interest-research ${VERSION}: public interest in topics from Wikipedia pageviews

Usage: ${LAUNCHER} <command> [options]

  doctor           Check Node, dependencies and the skill folder.

Commands still being built: find, related, analyze, report, cache.`;

function doctor(): number {
  let ok = true;
  const say = (good: boolean, message: string) => {
    if (!good) ok = false;
    console.log(`${good ? "OK  " : "FAIL"} ${message}`);
  };
  const [major, minor] = process.versions.node.split(".").map(Number);
  say(major > 20 || (major === 20 && minor >= 10), `Node ${process.versions.node} (need >= 20.10)`);
  say(existsSync(join(SKILL_DIR, "node_modules", "tsx")), "dependency tsx");
  say(existsSync(join(SKILL_DIR, "SKILL.md")), "SKILL.md is in place");
  console.log(ok ? "Ready." : `Fix the FAIL lines. Dependencies: npm ci --prefix "${SKILL_DIR}"`);
  return ok ? 0 : 2;
}

const command = process.argv[2];
if (!command || command === "help" || command === "--help") {
  console.log(USAGE);
  process.exitCode = 0;
} else if (command === "doctor") {
  process.exitCode = doctor();
} else {
  console.error(`Error: unknown command "${command}".\nHint: see ${LAUNCHER} --help`);
  process.exitCode = 1;
}
