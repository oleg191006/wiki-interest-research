import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

export interface CachedValue<T> {
  value: T;
  fetchedAt: number;
}

/** Persistent key-value storage for downloaded data. */
export interface KeyValueStore {
  get<T>(key: string, maxAgeMs?: number | null): CachedValue<T> | null;
  set(key: string, value: unknown, fetchedAt?: number): void;
}

interface Entry<T> {
  key: string;
  fetchedAt: number;
  value: T;
}

/**
 * One JSON file per key. Keys are logical ("pv|article|uk.wikipedia.org|Астрономія|all-access|user"),
 * not URLs, so a follow-up query with a longer period reuses what was already downloaded.
 */
export class FileCache implements KeyValueStore {
  readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  private file(key: string): string {
    return join(this.dir, `${createHash("sha1").update(key).digest("hex")}.json`);
  }

  get<T>(key: string, maxAgeMs: number | null = null): CachedValue<T> | null {
    let raw: string;
    try {
      raw = readFileSync(this.file(key), "utf8");
    } catch {
      return null;
    }
    try {
      const entry = JSON.parse(raw) as Entry<T>;
      if (entry.key !== key) return null;
      if (maxAgeMs !== null && Date.now() - entry.fetchedAt > maxAgeMs) return null;
      return { value: entry.value, fetchedAt: entry.fetchedAt };
    } catch {
      return null;
    }
  }

  /** Atomic write (temp file + rename), so parallel runs never read half a file. */
  set(key: string, value: unknown, fetchedAt = Date.now()): void {
    mkdirSync(this.dir, { recursive: true });
    const target = this.file(key);
    const tmp = `${target}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    writeFileSync(tmp, JSON.stringify({ key, fetchedAt, value } satisfies Entry<unknown>));
    renameSync(tmp, target);
  }

  stats(): { files: number; bytes: number } {
    let files = 0;
    let bytes = 0;
    try {
      for (const name of readdirSync(this.dir)) {
        if (!name.endsWith(".json")) continue;
        files++;
        bytes += statSync(join(this.dir, name)).size;
      }
    } catch {
      /* no cache yet */
    }
    return { files, bytes };
  }

  clear(): number {
    const { files } = this.stats();
    rmSync(this.dir, { recursive: true, force: true });
    return files;
  }
}
