import { isoDate } from "./calendar.ts";

export interface Clock {
  today(): string;
}

export class SystemClock implements Clock {
  today(): string {
    return isoDate(new Date());
  }
}

export class FixedClock implements Clock {
  private readonly day: string;

  constructor(day: string) {
    this.day = day;
  }

  today(): string {
    return this.day;
  }
}
