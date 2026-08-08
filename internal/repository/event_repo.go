package repository

import (
	"context"
	"encoding/json"
	"orbit/internal/entity"
	"time"
)

type EventRepo struct {
	q Querier
}

func NewEventRepo(q Querier) *EventRepo {
	return &EventRepo{q: q}
}

func (r *EventRepo) Insert(ctx context.Context, e *entity.DomainEvent) error {
	row := r.q.QueryRow(ctx,
		`INSERT INTO domain_events (user_id, event_type, aggregate_type, aggregate_id, payload)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, occurred_at`,
		e.UserID, e.EventType, e.AggregateType, nullableStringPtr(e.AggregateID), e.Payload)
	return row.Scan(&e.ID, &e.OccurredAt)
}

func (r *EventRepo) LastUserActivity(ctx context.Context, userID string, eventTypes []entity.EventType) (*time.Time, error) {
	row := r.q.QueryRow(ctx,
		`SELECT occurred_at FROM domain_events
		 WHERE user_id = $1 AND event_type = ANY($2)
		 ORDER BY occurred_at DESC LIMIT 1`, userID, eventTypes)
	var t time.Time
	if err := row.Scan(&t); err != nil {
		if isNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (r *EventRepo) ActivityOnDay(ctx context.Context, userID string, eventTypes []entity.EventType, day time.Time) (bool, error) {
	var n int
	err := r.q.QueryRow(ctx,
		`SELECT count(*) FROM domain_events
		 WHERE user_id = $1 AND event_type = ANY($2)
		   AND occurred_at >= $3 AND occurred_at < $4`,
		userID, eventTypes, day, day.AddDate(0, 0, 1)).Scan(&n)
	return n > 0, err
}

func (r *EventRepo) ListRecent(ctx context.Context, userID string, limit int) ([]entity.DomainEvent, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, event_type, aggregate_type, aggregate_id, payload, occurred_at
		 FROM domain_events WHERE user_id = $1 ORDER BY occurred_at DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.DomainEvent
	for rows.Next() {
		var e entity.DomainEvent
		var payload []byte
		if err := rows.Scan(&e.ID, &e.EventType, &e.AggregateType, &e.AggregateID, &payload, &e.OccurredAt); err != nil {
			return nil, err
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &e.Payload); err != nil {
				return nil, err
			}
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *EventRepo) ListByAggregate(ctx context.Context, userID string, aggregateType string, aggregateID string) ([]entity.DomainEvent, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, event_type, aggregate_type, aggregate_id, payload, occurred_at
		 FROM domain_events
		 WHERE user_id = $1 AND aggregate_type = $2 AND aggregate_id = $3
		 ORDER BY occurred_at`, userID, aggregateType, aggregateID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.DomainEvent
	for rows.Next() {
		var e entity.DomainEvent
		var payload []byte
		if err := rows.Scan(&e.ID, &e.EventType, &e.AggregateType, &e.AggregateID, &payload, &e.OccurredAt); err != nil {
			return nil, err
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &e.Payload); err != nil {
				return nil, err
			}
		}
		out = append(out, e)
	}
	return out, rows.Err()
}
