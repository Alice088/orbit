package repository

import (
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func nullableStringPtr(s *string) *string {
	return s
}

func nullableTime(t *time.Time) *time.Time {
	return t
}

func isNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
