import { monthName } from "../../domain/calendar.ts";
import type { UiLang } from "../../domain/languages/display-names.ts";
import type { Confidence, Flag, Verdict } from "../../domain/trend/model.ts";
import { EN, type MessageKey } from "./messages-en.ts";

const MESSAGES: Partial<Record<UiLang, Record<MessageKey, string>>> = { en: EN };

const SIGNED_PARAMS = ["growth", "despiked", "project", "normalized", "low", "high"];

export class Translator {
  readonly lang: UiLang;

  constructor(lang: UiLang) {
    this.lang = lang;
  }

  get locale(): UiLang {
    return this.lang;
  }

  t(key: MessageKey, params: Record<string, string | number> = {}): string {
    const template = (MESSAGES[this.lang] ?? EN)[key];
    return template.replace(/\{(\w+)\}/g, (_, k: string) =>
      params[k] !== undefined ? String(params[k]) : `{${k}}`,
    );
  }

  verdict(v: Verdict): string {
    return this.t(`verdict.${v}`);
  }

  confidence(c: Confidence, short = false): string {
    return this.t(short ? `conf.short.${c}` : `conf.${c}`);
  }

  flag(f: Pick<Flag, "code" | "params">): string {
    const p = { ...f.params };
    if (f.code === "seasonal" && typeof p.peaks === "string") {
      p.peaks = p.peaks
        .split(",")
        .map((m) => monthName(Number(m), this.locale))
        .join(", ");
    }
    for (const k of SIGNED_PARAMS) {
      if (typeof p[k] === "number") p[k] = signed(p[k] as number);
    }
    return this.t(`flag.${f.code}`, p);
  }

  monthName(m: number): string {
    return monthName(m, this.locale);
  }
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}
