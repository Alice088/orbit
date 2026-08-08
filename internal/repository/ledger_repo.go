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

type TransactionRow struct {
	entity.PointTransaction
	GoalTitle   string
	SourceTitle string
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

func (r *LedgerRepo) ListRecent(ctx context.Context, userID string, limit, offset int) ([]TransactionRow, error) {
	rows, err := r.q.Query(ctx,
		`SELECT pt.id, pt.currency, pt.amount, pt.reason, pt.goal_id, pt.domain_event_id, pt.created_at, COALESCE(g.title, ''), COALESCE(de.payload->>'title', '')
		 FROM point_transactions pt
		 LEFT JOIN goals g ON pt.goal_id = g.id
		 LEFT JOIN domain_events de ON pt.domain_event_id = de.id
		 WHERE pt.user_id = $1
		 ORDER BY pt.created_at DESC LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []TransactionRow
	for rows.Next() {
		var t TransactionRow
		if err := rows.Scan(&t.ID, &t.Currency, &t.Amount, &t.Reason, &t.GoalID, &t.DomainEventID, &t.CreatedAt, &t.GoalTitle, &t.SourceTitle); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (r *LedgerRepo) Count(ctx context.Context, userID string) (int, error) {
	var n int
	err := r.q.QueryRow(ctx, `SELECT count(*) FROM point_transactions WHERE user_id = $1`, userID).Scan(&n)
	return n, err
}

func (r *LedgerRepo) ByEvent(ctx context.Context, eventID string) ([]entity.PointTransaction, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, user_id, currency, amount, reason, goal_id, domain_event_id, created_at
		 FROM point_transactions WHERE domain_event_id = $1 ORDER BY created_at`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.PointTransaction
	for rows.Next() {
		var t entity.PointTransaction
		if err := rows.Scan(&t.ID, &t.UserID, &t.Currency, &t.Amount, &t.Reason, &t.GoalID, &t.DomainEventID, &t.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (r *LedgerRepo) DeleteGPPByGoal(ctx context.Context, userID string, goalID string) error {
	_, err := r.q.Exec(ctx,
		`DELETE FROM point_transactions WHERE user_id = $1 AND goal_id = $2 AND currency = 'gpp'`, userID, goalID)
	return err
}
