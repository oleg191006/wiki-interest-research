import { AnalyzeTopics } from "./application/analyze/analyze-topics.ts";
import { CliApp } from "./cli/cli-app.ts";
import type { Command, Output } from "./cli/command.ts";
import { AnalyzeCommand } from "./cli/commands/analyze-command.ts";
import { CacheCommand } from "./cli/commands/cache-command.ts";
import { FindCommand } from "./cli/commands/find-command.ts";
import { DoctorCommand } from "./cli/commands/doctor-command.ts";
import { usage } from "./cli/usage.ts";
import { FixedClock, SystemClock, type Clock } from "./domain/clock.ts";
import { FileCache } from "./infrastructure/cache/file-cache.ts";
import { CachedJsonClient, type CacheMode } from "./infrastructure/http/cached-json-client.ts";
import { FetchTransport, RequestStats } from "./infrastructure/http/fetch-transport.ts";
import { RateLimiter } from "./infrastructure/http/rate-limiter.ts";
import { IncrementalSeriesCache } from "./infrastructure/wikimedia/incremental-series-cache.ts";
import { PageviewsApi } from "./infrastructure/wikimedia/pageviews-api.ts";
import { WikidataApi } from "./infrastructure/wikimedia/wikidata-api.ts";
import { WikipediaApi } from "./infrastructure/wikimedia/wikipedia-api.ts";
import type { Settings } from "./settings.ts";

export function createCli(settings: Settings, output: Output): CliApp {
  const clock: Clock = settings.fixedToday
    ? new FixedClock(settings.fixedToday)
    : new SystemClock();
  return new CliApp({
    usage: usage(settings),
    launcher: settings.launcher,
    output,
    commands: (mode) => buildCommands(settings, mode, clock, output),
  });
}

function buildCommands(
  settings: Settings,
  mode: CacheMode,
  clock: Clock,
  output: Output,
): Command[] {
  const log = (message: string) => output.log(message);
  const cache = new FileCache(settings.cacheDir);
  const stats = new RequestStats();
  const transport = new FetchTransport({
    userAgent: settings.userAgent,
    limiter: new RateLimiter(
      settings.maxConcurrency,
      Math.ceil(60_000 / settings.requestsPerMinute),
    ),
    stats,
    log,
  });
  const client = new CachedJsonClient(transport, cache, mode, stats);
  const pageviews = new PageviewsApi(
    new IncrementalSeriesCache({ transport, store: cache, mode, stats, clock }),
  );
  const catalog = new WikidataApi(client, cache);
  const directory = new WikipediaApi(client);
  const analyze = new AnalyzeTopics({
    catalog,
    directory,
    pageviews,
    clock,
    version: settings.version,
    log,
  });

  return [
    new FindCommand({ catalog, directory, launcher: settings.launcher, output }),
    new AnalyzeCommand({ useCase: analyze, launcher: settings.launcher, output }),
    new DoctorCommand({ settings, cache, pageviews, clock, output }),
    new CacheCommand(cache, output),
  ];
}
