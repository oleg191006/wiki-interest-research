import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const skillDir = join(dirname(fileURLToPath(import.meta.url)), "..");

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 10)) {
  console.error(
    `Error: Node.js ${process.versions.node} is too old; this skill needs Node 20.10 or newer.`,
  );
  process.exit(2);
}

if (!existsSync(join(skillDir, "node_modules", "tsx"))) {
  console.error(
    `Error: dependencies are not installed.\nHint: run once: npm ci --prefix "${skillDir}"   (then repeat your command)`,
  );
  process.exit(2);
}

const { register } = await import("tsx/esm/api");
register();
await import(pathToFileURL(join(skillDir, "src", "main.ts")).href);
