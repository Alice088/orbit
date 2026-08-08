package repository

import (
	"context"
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
