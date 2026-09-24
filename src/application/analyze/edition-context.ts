import { missingHomeCountries } from "../../domain/languages/home-countries.ts";
import type { Lang } from "../../domain/languages/language.ts";
import { sum } from "../../domain/stats.ts";
import type { Windows } from "../../domain/trend/windows.ts";
import type { EditionContext } from "../analysis-model.ts";
import type { EditionTraffic } from "./traffic-loader.ts";

export function editionContext(
  lang: Lang,
  ed: EditionTraffic,
  w: Windows,
  days: string[],
  countriesMonth: string,
): EditionContext {
  const inMonths = (ms: string[]) =>
    sum(days.map((d, i) => (ms.includes(d.slice(0, 7)) ? ed.all[i] : 0)));
  const totalRecent = inMonths(w.recentMonths);
  const totalBaseline = inMonths(w.baselineMonths);
  const devices = Object.values(ed.devices);
  return {
    code: lang.code,
    project: lang.project,
    monthly: w.months.map((m) => sum(days.map((d, i) => (d.startsWith(m) ? ed.all[i] : 0)))),
    totalRecent,
    totalBaseline,
    growth: totalBaseline > 0 ? totalRecent / totalBaseline - 1 : null,
    uniqueDevices: devices.length ? sum(devices) / devices.length : null,
    topCountries: ed.countries,
    countriesMonth,
    countriesHidden:
      missingHomeCountries(
        lang.code,
        ed.countries.map((c) => c.country),
      ) ?? [],
  };
}
