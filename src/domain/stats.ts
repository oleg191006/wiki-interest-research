export function sum(a: readonly number[]): number {
  let s = 0;
  for (const v of a) s += v;
  return s;
}

export function quantile(a: readonly number[], q: number): number {
  if (!a.length) return Number.NaN;
  const s = [...a].sort((x, y) => x - y);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export function median(a: readonly number[]): number {
  return quantile(a, 0.5);
}

export function rollingMedian(values: readonly number[], half: number): number[] {
  const out = new Array<number>(values.length);
  for (let i = 0; i < values.length; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(values.length - 1, i + half);
    out[i] = median(values.slice(lo, hi + 1));
  }
  return out;
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function signTestP(up: number, n: number): number {
  if (n === 0) return 1;
  const k = Math.min(up, n - up);
  let tail = 0;
  let c = 1;
  for (let i = 0; i <= k; i++) {
    tail += c;
    c = (c * (n - i)) / (i + 1);
  }
  return Math.min(1, (2 * tail) / 2 ** n);
}

export interface PairedBootstrap {
  low: number;
  high: number;
  normLow: number;
  normHigh: number;
}

/**
 * Paired bootstrap over months: month m of the recent window is paired with the same calendar
 * month a year earlier, so seasonality cancels. Resampling the pairs answers "how much would the
 * growth estimate move if a different mix of months had happened?" Growth that comes from one
 * or two unusual months gets a wide interval, growth present in most months gets a narrow one.
 */
export function pairedBootstrap(
  recent: readonly number[],
  base: readonly number[],
  projRecent: readonly number[],
  projBase: readonly number[],
  seed: number,
  iterations = 5000,
): PairedBootstrap {
  const n = recent.length;
  const rand = mulberry32(seed);
  const growth: number[] = [];
  const norm: number[] = [];
  for (let it = 0; it < iterations; it++) {
    let r = 0;
    let b = 0;
    let pr = 0;
    let pb = 0;
    for (let j = 0; j < n; j++) {
      const k = Math.floor(rand() * n);
      r += recent[k];
      b += base[k];
      pr += projRecent[k];
      pb += projBase[k];
    }
    if (b <= 0) continue;
    const g = r / b;
    growth.push(g - 1);
    if (pr > 0 && pb > 0) norm.push(g / (pr / pb) - 1);
  }
  return {
    low: quantile(growth, 0.025),
    high: quantile(growth, 0.975),
    normLow: quantile(norm, 0.025),
    normHigh: quantile(norm, 0.975),
  };
}
