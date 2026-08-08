package repository

import (
	"context"
	"orbit/internal/entity"
)

type LedgerRepo struct {
	q Querier
}

func NewLedgerRepo(q Querier) *LedgerRepo {
	return &LedgerRepo{q: q}
}

func (r *LedgerRepo) Insert(ctx context.Context, t *entity.PointTransaction) error {
	row := r.q.QueryRow(ctx,
		`INSERT INTO point_transactions (user_id, currency, amount, reason, goal_id, domain_event_id)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
		t.UserID, t.Currency, t.Amount, t.Reason, nullableStringPtr(t.GoalID), nullableStringPtr(t.DomainEventID))
	return row.Scan(&t.ID, &t.CreatedAt)
}

func (r *LedgerRepo) SumGPPForGoal(ctx context.Context, userID string, goalID string) (int, error) {
	var sum int
	err := r.q.QueryRow(ctx,
		`SELECT COALESCE(sum(amount), 0) FROM point_transactions
		 WHERE user_id = $1 AND goal_id = $2 AND currency = 'gpp'`, userID, goalID).Scan(&sum)
	return sum, err
}

func (r *LedgerRepo) SumXP(ctx context.Context, userID string) (int, error) {
	var sum int
	err := r.q.QueryRow(ctx,
		`SELECT COALESCE(sum(amount), 0) FROM point_transactions
		 WHERE user_id = $1 AND currency = 'xp'`, userID).Scan(&sum)
	return sum, err
}
