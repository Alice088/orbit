# ADR-0007: Penalty model

Status: Accepted

## Decision

Two penalty classes, two currencies.

- Goal regression → −GPP (manual, user-initiated, with reason).
  Example: removed a validated design → −80 GPP.
- Discipline violation → −XP (system-initiated or manual).
  Example: missed mandatory workout twice → −10 XP.

Streak is state, not currency: current_days, longest_days, misses_in_row,
last_success_date. Streak updates are triggered by events
(HabitCompleted, DailyCheck), never by user declarations of failure.

Miss rule ("don't miss twice"):

- Day 1 miss: misses_in_row = 1, streak preserved, no penalty (warning only).
- Day 2 consecutive miss: misses_in_row = 2, streak resets, −XP penalty.

Absence of progress is not regression: not doing a task changes GPP by 0.

## Rationale

The first missed day must not punish (demotivation of a single bad day);
the second consecutive miss resets the streak because the behavior chain is
broken. Regression must be an explicit, reason-carrying action, not an
automated guess.

## Consequences

- Penalty engine receives decisions (Penalty{currency, amount, reason}),
  it never decides about timers or dates.
- No cron-driven habit penalties; settlement detects misses lazily and
  retroactively.
