import { SourceError } from "../../domain/errors.ts";
import { sleep, type RateLimiter } from "./rate-limiter.ts";

export interface JsonResponse<T = any> {
  status: number;
  data: T | null;
}

export class RequestStats {
  requests = 0;
  cacheHits = 0;
  retries = 0;
}

export interface JsonTransport {
  fetchJson<T = any>(url: string): Promise<JsonResponse<T>>;
}

export interface FetchTransportOptions {
  userAgent: string;
  limiter: RateLimiter;
  stats: RequestStats;
  log: (message: string) => void;
  maxAttempts?: number;
}

const RETRYABLE = [429, 500, 502, 503, 504];

/** fetch() with Wikimedia's etiquette: identified User-Agent, rate limit, retries honoring Retry-After. */
export class FetchTransport implements JsonTransport {
  private readonly opts: FetchTransportOptions;
  private readonly maxAttempts: number;

  constructor(opts: FetchTransportOptions) {
    this.opts = opts;
    this.maxAttempts = opts.maxAttempts ?? 5;
  }

  async fetchJson<T = any>(url: string): Promise<JsonResponse<T>> {
    for (let attempt = 1; ; attempt++) {
      const { status, body, retryAfter, networkError } = await this.attempt(url);
      if (status >= 200 && status < 300) return { status, data: parseJson<T>(body, url) };
      if (status === 404) return { status: 404, data: null };

      const retryable = status === 0 || RETRYABLE.includes(status);
      if (!retryable || attempt >= this.maxAttempts) throw failure(url, status, body, networkError);

      const waitMs = backoffMs(retryAfter, attempt);
      this.opts.stats.retries++;
      this.opts.log(
        `  ${status ? `HTTP ${status}` : "network error"}; retrying in ` +
          `${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${this.maxAttempts})`,
      );
      await sleep(waitMs + Math.floor(Math.random() * 250));
    }
  }

  private attempt(url: string): Promise<Attempt> {
    return this.opts.limiter.run(async () => {
      try {
        this.opts.stats.requests++;
        const response = await fetch(url, {
          headers: { "User-Agent": this.opts.userAgent, Accept: "application/json" },
          signal: AbortSignal.timeout(45_000),
        });
        return {
          status: response.status,
          retryAfter: response.headers.get("retry-after"),
          body: await response.text(),
        };
      } catch (err) {
        return { status: 0, body: "", retryAfter: null, networkError: err };
      }
    });
  }
}

interface Attempt {
  status: number;
  body: string;
  retryAfter: string | null;
  networkError?: unknown;
}

/** Wikimedia's own Retry-After wins over our guess; otherwise 1s, 2s, 4s, 8s. */
function backoffMs(retryAfter: string | null, attempt: number): number {
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds, 60) * 1000;
  return 1000 * 2 ** (attempt - 1);
}

function parseJson<T>(body: string, url: string): T {
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new SourceError(`Wikimedia returned invalid JSON for ${url}`, "Retry later.");
  }
}

function failure(url: string, status: number, body: string, networkError: unknown): SourceError {
  const what = status ? `HTTP ${status}` : `network error: ${String(networkError)}`;
  return new SourceError(
    `Wikimedia request failed (${what}): ${url}\n${body.slice(0, 300)}`,
    status === 429
      ? "Rate limited by Wikimedia. Wait a minute and retry; set WIKI_SKILL_CONTACT to a URL or email so requests are identified."
      : "Check the internet connection and the arguments (language code, title), then retry.",
  );
}
