# ADR-0004: Streak rewards

Status: Accepted

## Decision

- Streaks are tracked by streak-engine.
- Base XP of a habit does not depend on streak length.
- A streak may only grant discrete milestone bonuses
  (e.g. 7 days → +5 XP, 30 days → +25 XP, 100 days → +100 XP).
- Multipliers of the form base_xp × streak_multiplier are forbidden.
- Habit carries streak_tracking (bool) and streak_milestones
  (list of days → bonus_xp), not streak_enabled.

## Rationale

A multiplier turns any minimal micro-action into an XP engine and creates
infinite farming (preserve the counter, farm the bonus). Discrete milestones
keep the economy linear: base rewards dominate, bonuses are significant but
bounded.

## Consequences

- Economy stays linear: 10 workouts ≈ 50 XP, 100 workouts ≈ 500 XP,
  milestones add at most +2+5+10+25+100 XP total.
- Motivation to keep a streak stays: future milestones, counter, achievements,
  statistics — but no ratio-driven grind.
