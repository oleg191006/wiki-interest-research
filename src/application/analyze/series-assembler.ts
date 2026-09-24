import type { Lang } from "../../domain/languages/language.ts";
import type { SeriesInput } from "../../domain/trend/model.ts";
import type { TopicReport } from "../analysis-model.ts";
import type { Traffic } from "./traffic-loader.ts";

export function assembleSeries(
  topics: TopicReport[],
  langs: Lang[],
  traffic: Traffic,
  days: string[],
): SeriesInput[] {
  const inputs: SeriesInput[] = [];
  for (const tr of topics) {
    for (const lang of langs) {
      const arts = tr.articles[lang.code];
      if (!arts.length) continue;
      const views = new Array<number>(days.length).fill(0);
      const desktop = new Array<number>(days.length).fill(0);
      let canon60 = 0;
      let redir60 = 0;
      for (const a of arts) {
        const d = traffic.article(lang.code, a.title);
        d.all.forEach((v, i) => (views[i] += v));
        d.desktop.forEach((v, i) => (desktop[i] += v));
        canon60 += a.views60 ?? 0;
        redir60 += d.redirect60;
        a.redirectViews60 = d.redirect60;
      }
      const edition = traffic.edition(lang.code);
      inputs.push({
        id: `${tr.name}|${lang.code}`,
        topic: tr.name,
        lang: lang.code,
        days,
        views,
        desktop,
        projViews: edition.all,
        projDesktop: edition.desktop,
        articles: arts.map((a) => ({ title: a.title, created: a.created })),
        redirectShare: canon60 + redir60 > 0 ? redir60 / (canon60 + redir60) : 0,
      });
    }
  }
  return inputs;
}
