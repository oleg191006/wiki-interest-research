const DAY_MS = 86_400_000;

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function fromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isIsoDate(s: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toDate(s).getTime()) && fromDate(toDate(s)) === s
  );
}

export function isoDate(d: Date): string {
  return fromDate(d);
}

export function addDays(iso: string, n: number): string {
  return fromDate(new Date(toDate(iso).getTime() + n * DAY_MS));
}

export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  const yy = Math.floor(idx / 12);
  const mm = (idx % 12) + 1;
  return `${yy}-${String(mm).padStart(2, "0")}`;
}

export function monthStart(month: string): string {
  return `${month}-01`;
}

export function monthEnd(month: string): string {
  return addDays(monthStart(addMonths(month, 1)), -1);
}

export function monthRange(first: string, last: string): string[] {
  const out: string[] = [];
  for (let m = first; m <= last; m = addMonths(m, 1)) out.push(m);
  return out;
}

/** Latest month whose data is complete: its last day must be at least 2 days old (API lag). */
export function lastCompleteMonth(today: string): string {
  let m = addMonths(monthOf(today), -1);
  while (monthEnd(m) > addDays(today, -2)) m = addMonths(m, -1);
  return m;
}

export function compactDate(iso: string): string {
  return iso.replaceAll("-", "");
}

export function fromApiTimestamp(ts: string): string {
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
}
