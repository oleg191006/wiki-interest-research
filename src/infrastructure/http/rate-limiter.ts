export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class RateLimiter {
  private active = 0;
  private waiting: Array<() => void> = [];
  private nextStart = 0;
  private readonly max: number;
  private readonly intervalMs: number;

  constructor(max: number, intervalMs: number) {
    this.max = max;
    this.intervalMs = intervalMs;
  }

  async acquire(): Promise<void> {
    if (this.active < this.max) this.active++;
    else await new Promise<void>((resolve) => this.waiting.push(resolve));
    const now = Date.now();
    const start = Math.max(now, this.nextStart);
    this.nextStart = start + this.intervalMs;
    if (start > now) await sleep(start - now);
  }

  release(): void {
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
  }
}
