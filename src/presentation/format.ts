export const MINUS = "−";

export function pct(x: number | null | undefined, digits = 0): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "n/a";
  const v = x * 100;
  const s = Math.abs(v).toFixed(digits);
  if (Number(s) === 0) return `0%`;
  return `${v > 0 ? "+" : MINUS}${s}%`;
}

export function ciText(ci: [number, number] | null | undefined): string {
  if (!ci || !Number.isFinite(ci[0]) || !Number.isFinite(ci[1])) return "n/a";
  return `${pct(ci[0])}…${pct(ci[1])}`;
}

export function num(x: number, locale = "en"): string {
  return new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(x));
}

export function compactNum(x: number, locale = "en"): string {
  if (Math.abs(x) < 10_000) return num(x, locale);
  return new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(x);
}

export function perMillion(x: number): string {
  if (x >= 100) return x.toFixed(0);
  if (x >= 10) return x.toFixed(1);
  return x.toFixed(2);
}

export function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "topic"
  );
}
