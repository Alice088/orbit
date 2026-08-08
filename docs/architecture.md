# Orbit — Architecture

Gamified life-management system. Single Go binary, Postgres, REST API.
All UI (web/mobile) is deferred to v2.

## Context

The system turns life goals into a game loop: goals are split into milestones,
tasks move progress between milestones, habits build streaks, and everything
flows through two currencies into a ledger.

## Layers

```
HTTP / Scheduler
        ↓
Application Service (internal/service)
        ↓
┌──────────────────────────┐
│  domain_events           │  append-only journal, audit + activity
└──────────────────────────┘
        ↓
Reward / Penalty Policy (internal/engine/*)
        ↓
┌──────────────────────────┐
│  point_transactions      │  XP / GPP ledger
└──────────────────────────┘
        ↓
Read models / stats (daily_stats)
```

- One binary, one process, one user. No microservices, no async event bus.
- Everything happens in one DB transaction per operation.
- Engines are pure functions: no DB, no HTTP, testable in isolation.

## Currencies

| Currency | Scope       | Source                                          | Goes to        |
| -------- | ----------- | ----------------------------------------------- | -------------- |
| GPP      | per goal    | milestone delta × contribution_coef             | goal progress  |
| XP       | global      | gpp × difficulty_multiplier (min 1); habit base_xp | levels         |

Integer math only, rounding down.

## Engines (internal/engine/*)

| Package  | Responsibility                                             |
| -------- | ---------------------------------------------------------- |
| scoring  | GPP and XP calculation for tasks, habit XP                 |
| streak   | streak state transitions, miss handling, milestone bonuses |
| level    | XP → level thresholds                                      |
| penalty  | penalty application policy                                 |
| economy  | daily habit cap, weekly rebalance report                   |
| progress | goal progress percentage                                   |

## Storage

Tables: users, goals, milestones, tasks, habits, habit_streak_milestones,
streaks, domain_events, point_transactions, day_settlements, daily_stats,
achievements.

## Key invariants

- For each (user, day) there is at most one settlement.
- XP and levels are monotonic (no decay).
- Streak does not multiply base XP (discrete milestone bonuses only).
- Absence of progress is not regression.
- First missed day is free; second consecutive miss resets the streak.
- Penalties for goal regression hit GPP; discipline violations hit XP.
- Only user-generated events count as activity (inactivity rule).
- Task completion is idempotent (one reward per task).

## API (v1)

| Method | Path                    | Purpose                        |
| ------ | ----------------------- | ------------------------------ |
| POST   | /auth/session           | owner login by name (auto-provision on first run) |
| POST   | /goals                  | create goal                    |
| GET    | /goals                  | list goals                     |
| GET    | /goals/{id}             | goal detail                    |
| GET    | /goals/{id}/progress    | goal progress                  |
| POST   | /goals/{id}/review      | goal review (activity event)   |
| DELETE | /goals/{id}             | delete goal + tasks (XP kept)  |
| POST   | /tasks                  | create task                    |
| POST   | /tasks/{id}/complete    | complete task (+GPP, +XP)      |
| POST   | /habits                 | create habit                   |
| POST   | /habits/{id}/complete   | complete habit (+XP, streak)   |
| DELETE | /habits/{id}            | delete habit (XP kept)         |
| GET    | /streaks                | streak states                  |
| POST   | /checkin                | manual check-in (activity)     |
| POST   | /penalties              | manual penalty (XP/GPP, reason) |
| GET    | /stats/today            | today's stats                  |
| GET    | /stats/week             | weekly stats                   |
| GET    | /levels/current         | current level and XP           |
| GET    | /analytics/overview     | category efficiency, ratio, rebalance suggestion |
| GET    | /tasks                  | list tasks                     |
| DELETE | /tasks/{id}             | delete task (completed → XP/GPP recalc) |
| GET    | /activity               | recent domain events           |
| GET    | /transactions           | ledger history                 |

## Scheduler

- Midnight goroutine in cmd/api fires SettleDay for the new day.
- On startup, catch-up settles every unsettled day up to today.
- Settlement is idempotent via day_settlements (ON CONFLICT DO NOTHING).
- Inactivity rule: no user-generated activity for threshold_hours → XP penalty.
