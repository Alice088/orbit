# ADR-0003: Daily settlement and inactivity handling

Status: Accepted

## Decision

- Midnight scheduler is a goroutine inside cmd/api.
- All daily rules run through one service method: SettleDay(ctx, day).
- On startup, catch-up settles every unsettled day up to today.
- Settlement is idempotent and recorded in day_settlements
  (PRIMARY KEY (user_id, day), INSERT ... ON CONFLICT DO NOTHING).
- The inactivity rule runs as part of settlement:
  no user-generated activity within threshold_hours → XP penalty.
- Activity is defined by an explicit whitelist of user-generated event types,
  never by settlement events themselves.
- Next local midnight is computed from the clock each cycle (DST-safe),
  never time.Sleep(24h).

## Rationale

One code path for rewards and penalties (no separate cron service), correct
behavior after downtime, trivially testable SettleDay as a plain function.

## Consequences

- Requires careful local timezone and DST handling.
- Very long downtime means catch-up processes many days (batch if needed).
