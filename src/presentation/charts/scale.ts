export function niceTicks(min: number, max: number, target = 5): number[] {
  if (!(max > min)) max = min + 1;
  const raw = (max - min) / Math.max(1, target);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  const out: number[] = [];
  for (
    let v = Math.floor(min / step) * step;
    v <= Math.ceil(max / step) * step + step / 2;
    v += step
  )
    out.push(Number(v.toFixed(10)));
  return out;
}
