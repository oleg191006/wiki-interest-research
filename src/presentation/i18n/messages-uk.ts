// Ukrainian texts. Typed against the English keys, so a missing translation is a compile error.
import type { MessageKey } from "./messages-en.ts";

export const UK: Record<MessageKey, string> = {
  "verdict.rising": "зростає",
  "verdict.falling": "спадає",
  "verdict.flat": "стабільно",
  "verdict.unclear": "неясно",
  "verdict.insufficient": "немає даних",
  "conf.high": "висока впевненість",
  "conf.medium": "середня впевненість",
  "conf.low": "низька впевненість",
  "conf.short.high": "висока",
  "conf.short.medium": "середня",
  "conf.short.low": "низька",

  "flag.very_low_volume":
    "Дуже малий обсяг (медіана переглядів за день: {median}), тож кілька читачів можуть змінити результат.",
  "flag.low_volume": "Малий обсяг (медіана переглядів за день: {median}), відсотки орієнтовні.",
  "flag.ci_includes_zero": "95% інтервал ({low}%…{high}%) містить нуль: надійної зміни немає.",
  "flag.inconsistent_months": "Лише {agree} з {n} місяців рухалися в цьому напрямку.",
  "flag.spike_driven":
    "Зумовлено сплесками: загалом {growth}%, але {despiked}%, якщо обрізати дні-сплески.",
  "flag.spikes_present": "Днів-сплесків в останньому періоді: {count} ({share}% його переглядів).",
  "flag.bot_suspected":
    "Можливий автоматизований трафік: частка десктопу {deskBase}% → {deskRecent}%, а у всьому розділі {projBase}% → {projRecent}%.",
  "flag.article_new":
    "Статтю створено під час періоду порівняння ({titles}, {created}): зростання завищене.",
  "flag.abrupt_start":
    "Перегляди різко з'являються у {month} (нова чи перейменована стаття?): зростання непорівнюване.",
  "flag.platform_opposite":
    "Весь мовний розділ змінився на {project}%, а відносно нього тема змінилася на {normalized}%, тож сирий тренд переважно відображає платформу.",
  "flag.platform_context": "Весь розділ {project}% р/р; тема відносно нього {normalized}%.",
  "flag.redirect_share":
    "{share}% останніх переглядів припадає на редиректи (не враховані в основних числах).",
  "flag.seasonal": "Сезонні піки: {peaks} (до +{top}% від середнього).",
  "flag.no_baseline": "У базовому періоді немає переглядів, тож зростання обчислити неможливо.",

  "report.title": "Інтерес до теми: {topics}",
  "report.subtitle": "Перегляди Вікіпедії · {langs} · {period}",
  "report.question": "Питання",
  "report.answer": "Відповідь",
  "report.metrics": "Ключові показники",
  "report.recommendations": "Рекомендації",
  "report.nextSteps": "Наступні кроки",
  "report.trust": "Наскільки цьому довіряти",
  "report.limits": "Припущення та обмеження",
  "report.method": "Метод і джерела",
  "report.noIssues": "Автоматичні перевірки не виявили проблем.",
  "unit.yoy": "р/р",
  "report.chartTrend": "Перегляди за місяць, індекс (базовий період = 100)",
  "report.chartGrowth": "Зростання рік до року з 95% інтервалом",
  "report.chartDaily": "Щоденні перегляди, 29-денна медіана і дні-сплески",
  "col.series": "Тема · розділ",
  "col.avg": "Переглядів / міс",
  "col.growth": "Зростання р/р [95% ДІ]",
  "col.despiked": "Без сплесків",
  "col.normalized": "Відносно розділу",
  "col.months": "Місяців зросту",
  "col.verdict": "Висновок",
  "legend.raw": "Зростання р/р (95% інтервал)",
  "legend.norm": "Відносно всього розділу",
  "legend.edition": "Уся Вікіпедія ({lang})",
  "legend.recent": "Останній період",
  "legend.spike": "День-сплеск",
  "legend.median": "29-денна медіана",
  "legend.daily": "Перегляди за день",
  "limit.intent":
    "Перегляди вимірюють цікавість, а не готовність платити: це підказка, що перевіряти далі, а не доказ попиту.",
  "limit.country": "Мовний розділ не дорівнює країні. Читачі за країнами: {countries}.",
  "limit.countryHidden":
    "{lang}: дані за країнами не містять {country} (захист приватності Wikimedia), тож частки неповні",
  "limit.human":
    "Враховано лише трафік людей (agent=user); фільтр ботів Wikimedia неідеальний, тому аномалії перевірено вище.",
  "limit.titles":
    "Враховано поточні назви перелічених статей; редиректи та інші статті на тему не включено.",
  "limit.platform":
    "Загальний трафік Вікіпедії змінюється (AI-відповіді, пошук); колонка «відносно розділу» це враховує.",
  "limit.missing": "Відсутні статті: {items}. Ці мови виміряно на меншому наборі статей.",
  "method.text":
    "Дані: Wikimedia Pageviews API, щоденні перегляди людьми, усі платформи. Зростання = {recent} порівняно з тими ж місяцями роком раніше ({baseline}). 95% інтервал: парний бутстреп по місяцях (5000 повторів). День-сплеск: понад 3x від 29-денної медіани. Відносне зростання ділиться на загальні перегляди розділу. Створено {date}, wiki-interest-research {version}.",
  "method.articles": "Статті",
  "method.verify": "Перевірити",
  "auto.next.validate":
    "Перевірте найсильніший сигнал другим джерелом (пошукові тренди, ключові слова в магазинах застосунків) перед інвестуванням.",
  "auto.next.test":
    "Проведіть дешевий тест попиту (лендинг чи реклама) мовою з найвищим рейтингом.",
  "auto.next.basket":
    "Розширте тему до 4-8 пов'язаних статей, щоб перевірити, чи тренд тримається ширше, ніж одна сторінка.",
};
