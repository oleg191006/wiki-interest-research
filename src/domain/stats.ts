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
