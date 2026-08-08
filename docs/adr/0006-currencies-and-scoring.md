# ADR-0006: Currencies and scoring

Status: Accepted

## Decision

Two currencies, one source of truth each.

- GPP (Goal Progress Points): local to a goal. Sourced from milestones.
  progress_points = milestone_to.reward_points − milestone_from.reward_points.
  Goal progress = gpp_earned / goal.total_gpp.
- XP: global user currency, drives levels.
  task_xp = gpp / 10 × difficulty_multiplier.
  habit_xp = base_xp (+ optional streak milestone bonus).

Multipliers:

| Difficulty | Multiplier |
| ---------- | ---------- |
| easy       | 0.5        |
| normal     | 1.0        |
| hard       | 1.5        |
| epic       | 2.0        |

contribution_coef (0.5..1.0) scales GPP independently of difficulty.
Integer math only, rounding down everywhere.

## Rationale

Separating GPP (objective goal state) from XP (behavior/discipline) keeps
goal progress honest: a task either moves the goal or it does not, while XP
measures the user's reliability as an executor.

## Consequences

- Single formula for the scoring engine.
- Goal math is internally consistent: all task deltas across milestones sum
  exactly to total_gpp (times coefs).
- No fractional points anywhere.
