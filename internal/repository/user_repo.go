package repository

import (
	"context"
	"errors"
	"orbit/internal/entity"

	"github.com/jackc/pgx/v5"
)

type UserRepo struct {
	q Querier
}

func NewUserRepo(q Querier) *UserRepo {
	return &UserRepo{q: q}
}

var ErrNotFound = errors.New("not found")

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	row := r.q.QueryRow(ctx,
		`SELECT id, email, password_hash, created_at FROM users WHERE email = $1`, email)
	var u entity.User
	if err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (*entity.User, error) {
	row := r.q.QueryRow(ctx,
		`SELECT id, email, password_hash, created_at FROM users WHERE id = $1`, id)
	var u entity.User
	if err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) Count(ctx context.Context) (int, error) {
	var n int
	err := r.q.QueryRow(ctx, `SELECT count(*) FROM users`).Scan(&n)
	return n, err
}

func (r *UserRepo) ListIDs(ctx context.Context) ([]string, error) {
	rows, err := r.q.Query(ctx, `SELECT id FROM users`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

func (r *UserRepo) Create(ctx context.Context, email string, passwordHash string) (*entity.User, error) {
	row := r.q.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, created_at`, email, passwordHash)
	var u entity.User
	u.Email = email
	u.PasswordHash = passwordHash
	if err := row.Scan(&u.ID, &u.CreatedAt); err != nil {
		return nil, err
	}
	return &u, nil
}
