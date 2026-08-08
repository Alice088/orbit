# ADR-0008: Economy boundaries

Status: Accepted

## Decision

v1 economy package contains exactly:

- daily-cap: habit XP per day capped (config, default 50). Clamp XP, never
  break streaks or state. Tasks are not capped.
- weekly-rebalance: report-only. Suggests
  suggested_weekly_goal = avg_daily_xp_last_week × 1.1 in analytics.
  Never applies automatically.
- decay-policy: exists as a config parameter, disabled in v1. XP and levels
  are monotonic.

reward-store (spending points on rewards) is deferred to v2.

## Rationale

Auto-tuning and XP decay without real usage data is guesswork and a
demotivator (losing levels after a vacation). The cap bounds farming from
micro-habits; milestone bonuses (ADR-0004) already bound long-term inflation.

## Consequences

- XP and levels never decrease.
- One knob (daily cap) tunes habit economy in v1.
- reward-store arrives with v2 UI, when real spending patterns exist.
