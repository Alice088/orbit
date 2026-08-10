## Concept

An experiment is a universal card: "what I change → how I measure → what happened". Not a TODO, not a habit, not a diary — a container for any small improvement: a task-list method, flashcard recall, work mode, learning, sleep.

It rests on five principles:

- flexible — any topic;
- fast — 30 seconds to fill in;
- light — minimal fields;
- historical — every past attempt is kept;
- comparable — you see which small things actually worked.

## Family and versions

An experiment is a family of versions. Title, category and tags describe the family; each version is a separate run with its own change, metrics, baseline, check-ins and result.

v1 → v2 → v3 — versions are never overwritten. A new version is a fork of the previous one: tweak the method and start over. If you fork mid-run, the current version is marked aborted and no longer counts toward family statistics.

## Metrics

Six universal types:

| Type | What it is | Example |
|---|---|---|
| Count | quantity | tasks done, pages read |
| Duration | time | time to start work, focus length |
| Rate | ratio | 8/10 correct answers |
| Score | subjective rating 1–5 | how easy it was to start |
| Binary | yes/no | did you apply the method |
| Note | observation | what got in the way, what helped |

Exactly one metric is primary: it is required in every check-in and drives the verdict. The primary metric always has a direction: "higher is better" or "lower is better".

## Baseline

A baseline is your average value before the experiment: Orbit compares results against it and shows "−33%" instead of a bare number. It is set per metric per version.

- none — nothing to compare against; Orbit only shows averages;
- manual — you enter your own average;
- from history — the average of your check-ins from previous completed versions of the same experiment (available from version two onwards).

The baseline is frozen when the version starts and never changed retroactively — otherwise comparison loses meaning. If you made a mistake, create a new version with a new baseline.

## Check-in

One check-in per day. The primary metric is required, the rest are optional, the note is short. A missed day is just an empty point in the data: the run is neither extended nor penalized. Consistency is shown as a percentage in the results.

## Version lifecycle

draft → running → ended → completed

A draft can be edited. Starting freezes metrics and baselines. The run lasts a set number of calendar days. After the last day the version waits for a wrap-up: a short required reflection — did the change work? The reflection completes the version and includes it in family statistics. Aborted versions are excluded.

## Results and verdict

For every metric Orbit computes: average, min, max, % change vs baseline, trend (is the second half better than the first?), consistency.

The verdict is built on the primary metric: improved / worsened / no change. Without a baseline — "nothing to compare"; without data — "not enough data". The verdict does not decide for you — whether to continue is your call: the reflection is your conclusion.

## Comparing versions

The best version is chosen among completed versions with the same primary metric (type, unit, direction): the largest improvement vs baseline wins. Different metrics are never compared — that would be unfair.
