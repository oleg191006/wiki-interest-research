import { SourceError } from "../../domain/errors.ts";
import type { KeyValueStore } from "../cache/file-cache.ts";
import type { JsonResponse, JsonTransport, RequestStats } from "./fetch-transport.ts";

export interface CacheMode {
  offline: boolean;
  refresh: boolean;
}

export interface CachePolicy {
  key: string; // logical key, stable across URLs
  ttlMs: number | null; // null = never expires (historical data)
}

export class CachedJsonClient {
  readonly mode: CacheMode;
  private readonly transport: JsonTransport;
  private readonly store: KeyValueStore;
  private readonly stats: RequestStats;

  constructor(
    transport: JsonTransport,
    store: KeyValueStore,
    mode: CacheMode,
    stats: RequestStats,
  ) {
    this.transport = transport;
    this.store = store;
    this.mode = mode;
    this.stats = stats;
  }

  async get<T = any>(url: string, policy?: CachePolicy): Promise<JsonResponse<T>> {
    if (policy && !this.mode.refresh) {
      // Offline, any cached copy is better than none, so the age limit is ignored.
      const maxAge = this.mode.offline ? null : policy.ttlMs;
      const hit = this.store.get<JsonResponse<T>>(policy.key, maxAge);
      if (hit) {
        this.stats.cacheHits++;
        return hit.value;
      }
    }
    if (this.mode.offline) {
      throw new SourceError(
        `Offline mode: no cached response for ${policy?.key ?? url}`,
        "Run without --offline to download it.",
      );
    }
    const res = await this.transport.fetchJson<T>(url);
    if (policy && (res.status === 200 || res.status === 404)) this.store.set(policy.key, res);
    return res;
  }
}
