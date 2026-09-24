import type { EntityCatalog } from "../../application/ports.ts";
import type { Entity, SearchHit } from "../../application/wiki-types.ts";
import { SourceError } from "../../domain/errors.ts";
import type { KeyValueStore } from "../cache/file-cache.ts";
import type { CachedJsonClient } from "../http/cached-json-client.ts";
import { actionApiUrl, METADATA_TTL_MS, WIKIDATA_API } from "./endpoints.ts";

const BATCH_SIZE = 50;

type CachedEntity = Entity & { labelLangs: string[] };

export class WikidataApi implements EntityCatalog {
  private readonly client: CachedJsonClient;
  private readonly store: KeyValueStore;

  constructor(client: CachedJsonClient, store: KeyValueStore) {
    this.client = client;
    this.store = store;
  }

  async search(query: string, lang: string, limit = 7): Promise<SearchHit[]> {
    const url = actionApiUrl(WIKIDATA_API, {
      action: "wbsearchentities",
      search: query,
      language: lang,
      uselang: lang,
      type: "item",
      limit,
    });
    const res = await this.client.get(url, {
      key: `wd-search|${lang}|${query.toLowerCase()}|${limit}`,
      ttlMs: METADATA_TTL_MS,
    });
    const hits = (res.data?.search ?? []) as Array<{
      id: string;
      label?: string;
      description?: string;
      display?: any;
    }>;
    return hits.map((h) => ({
      qid: h.id,
      label: h.label ?? h.display?.label?.value ?? h.id,
      description: h.description ?? h.display?.description?.value ?? "",
    }));
  }

  async entities(qids: string[], labelLangs: string[]): Promise<Map<string, Entity>> {
    const out = new Map<string, Entity>();
    const wanted = [...new Set(["en", ...labelLangs])];
    const missing: string[] = [];
    for (const qid of new Set(qids.map((q) => q.toUpperCase()))) {
      const cached = this.cached(qid, wanted);
      if (cached) out.set(qid, cached);
      else missing.push(qid);
    }
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      for (const entity of await this.download(missing.slice(i, i + BATCH_SIZE), wanted)) {
        out.set(entity.qid, entity);
      }
    }
    return out;
  }

  private cached(qid: string, wanted: string[]): Entity | null {
    const { offline, refresh } = this.client.mode;
    const hit = this.store.get<CachedEntity>(`wd-entity|${qid}`, offline ? null : METADATA_TTL_MS);
    if (!hit || refresh) return null;
    return wanted.every((l) => hit.value.labelLangs.includes(l)) ? hit.value : null;
  }

  private async download(batch: string[], wanted: string[]): Promise<Entity[]> {
    if (this.client.mode.offline) {
      throw new SourceError(
        `Offline mode: entities ${batch.join(", ")} are not cached.`,
        "Run without --offline.",
      );
    }
    const url = actionApiUrl(WIKIDATA_API, {
      action: "wbgetentities",
      ids: batch.join("|"),
      props: "labels|descriptions|sitelinks",
      languages: wanted.join("|"),
    });
    const res = await this.client.get(url);
    const raw = (res.data?.entities ?? {}) as Record<string, any>;
    const entities: Entity[] = [];
    for (const qid of batch) {
      const e = raw[qid];
      if (!e || e.missing !== undefined) continue;
      const entity: Entity = {
        qid,
        labels: mapValues(e.labels),
        descriptions: mapValues(e.descriptions),
        sitelinks: mapValues(e.sitelinks, "title"),
      };
      this.store.set(`wd-entity|${qid}`, { ...entity, labelLangs: wanted });
      entities.push(entity);
    }
    return entities;
  }
}

function mapValues(raw: unknown, field: "value" | "title" = "value"): Record<string, string> {
  return Object.fromEntries(
    Object.entries((raw ?? {}) as Record<string, any>).map(([k, v]) => [k, v[field]]),
  );
}
