import Bottleneck from "bottleneck";

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class RateLimiter {
  private readonly limiter: Bottleneck;

  constructor(maxConcurrent: number, minTimeMs: number) {
    this.limiter = new Bottleneck({ maxConcurrent, minTime: minTimeMs });
  }

  /** Runs `job` once a slot is free and the minimum spacing has passed. */
  run<T>(job: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(job);
  }
}
