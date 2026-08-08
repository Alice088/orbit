# ADR-0005: Domain event log

Status: Accepted

## Decision

A separate append-only table domain_events stores every domain event
regardless of monetary effect. point_transactions is used strictly as the
XP/GPP ledger.

- Link is one-way: DomainEvent → 0..N PointTransactions (domain_event_id FK).
- Events without monetary effect (GoalCreated, GoalReviewed, ManualCheckIn)
  still count as activity.
- The inactivity rule reads max(occurred_at) over an explicit whitelist of
  user-generated event types.
- No event sourcing, no CQRS, no state replay. Current state lives in normal
  tables; domain_events is audit + telemetry + activity source.

## Rationale

Ledger ≠ activity journal. Not every event has a monetary footprint, and the
inactivity rule, audit and analytics must work independently of XP/GPP
transactions.

## Consequences

- Full audit chain: event → transaction, one query away.
- point_transactions stays a clean financial journal.
- Achievements are recorded as events (achievement_unlocked).
