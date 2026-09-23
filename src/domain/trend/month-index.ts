import { monthOf } from "../calendar.ts";
import { sum } from "../stats.ts";

export class MonthIndex {
  private readonly byMonth = new Map<string, number[]>();

  constructor(days: readonly string[]) {
    days.forEach((d, i) => {
      const m = monthOf(d);
      if (!this.byMonth.has(m)) this.byMonth.set(m, []);
      this.byMonth.get(m)!.push(i);
    });
  }

  positions(month: string): number[] {
    return this.byMonth.get(month) ?? [];
  }

  positionsOf(months: readonly string[]): number[] {
    return months.flatMap((m) => this.positions(m));
  }

  total(values: readonly number[], month: string): number {
    return sum(this.positions(month).map((i) => values[i]));
  }
}
