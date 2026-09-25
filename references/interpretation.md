# Interpretation guide

Read this when choosing articles, when results look odd, or when writing recommendations.

## Choosing articles

- Start from the concept, not the word: `find` returns Wikidata items with descriptions.
  Reject fictional, historical or narrower senses (e.g. "Astronomy (Hogwarts class)",
  "History of astronomy") unless the user means them.
- Broad subject → basket of 3-7 central pages a learner would read. Astronomy:
  astronomy, Solar System, black hole, galaxy, telescope, astrophysics. Language learning:
  exams (IELTS, TOEFL) show intent to study; the language's own article mixes in schoolwork.
- Keep the basket identical across languages when comparing them. Missing articles are listed
  under *Articles measured*; a language measured on fewer articles is not like-for-like.
- Very small editions or niche topics give a few views per day; prefer a broader basket or
  say the signal is too weak.

## Common patterns and how to word them

| Pattern in the summary | What to say |
|---|---|
| rising, high confidence, Months up 10+/12 | "Interest grew X% year over year and the rise shows up in most months, so it is a consistent trend." |
| raw falling but vs whole edition near 0 or positive | "Views fell, but the whole edition fell about as much; the topic held its share of attention." |
| spike_driven / big gap between raw and Excl. spikes | "Most of the increase comes from a few days (dates); without them the change is Y%." |
| unclear | "The data does not show a reliable change: the 95% interval runs from A to B." |
| very_low_volume | "Only a handful of readers per day, so percentages are unreliable." |
| article_new / abrupt_start | "The article is new or was renamed, so part of the growth is an artifact." |
| bot_suspected | "Part of the traffic looks automated (desktop-only surges); treat the growth with caution." |
| seasonal peaks | Useful for timing: launch or advertise ahead of the peak months. |
| no article in a language | "There is no article in X, so interest there cannot be measured this way (this is also a content gap)." |

Never attribute a spike to an event unless the user supplies it; you may say "possibly related
to ..., not verified".

## Languages are not markets

- Readers of an edition come from many countries (Spanish: Spain, Mexico, Argentina...). The
  *Editions* line shows the top countries for the latest month.
- `INCOMPLETE` country data: Wikimedia hides countries on its privacy protection list (e.g.
  Turkey, Vietnam, Iran, Russia), so the listed shares exclude the main audience.
- Many speakers read the English edition for technical topics, so small-language numbers
  understate interest; compare trends and shares rather than raw totals across editions.
- Unique devices per month give the rough readership size of an edition (market size context).

## What pageviews can and cannot support

Can support: which topics or languages to investigate first, whether interest is growing or
fading, seasonality for timing, relative prominence of a topic in each language.

Cannot support alone: willingness to pay, market size in money, causes of change, country-level
conclusions. Recommend a second source before investing: search volume (Google Trends,
keyword tools), app-store keyword data, a landing-page or ad test, user interviews.

## Typical follow-ups

- "Add language X / topic Y" → same command with extra `--langs` / `--topic`.
- "Longer history" → `--months 48` (adds year-by-year totals).
- "Only the last 6 months" → `--window 6` (still compared with the same months a year earlier).
- "We care more about growth than size" → `--weights growth=0.7,volume=0.2,share=0.1`.
- "Why is X ranked first?" → quote the ranking components and the Checks for X.
