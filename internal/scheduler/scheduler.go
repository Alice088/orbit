package scheduler

import (
	"context"
	"time"

	"github.com/rs/zerolog/log"
)

type SettlementService interface {
	SettleDueDays(ctx context.Context) (int, error)
	Location() *time.Location
}

type Scheduler struct {
	svc SettlementService
	loc *time.Location
}

func New(svc SettlementService) *Scheduler {
	return &Scheduler{svc: svc, loc: svc.Location()}
}

func nextMidnight(now time.Time, loc *time.Location) time.Time {
	now = now.In(loc)
	y, m, d := now.Date()
	return time.Date(y, m, d+1, 0, 0, 0, 0, loc)
}

func (s *Scheduler) Run(ctx context.Context) {
	if n, err := s.svc.SettleDueDays(ctx); err != nil {
		log.Error().Err(err).Msg("startup catch-up failed")
	} else if n > 0 {
		log.Info().Int("days", n).Msg("startup catch-up settled days")
	}
	for {
		now := time.Now()
		midnight := nextMidnight(now, s.loc)
		timer := time.NewTimer(midnight.Sub(now))
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
			if n, err := s.svc.SettleDueDays(ctx); err != nil {
				log.Error().Err(err).Msg("daily settlement failed")
			} else if n > 0 {
				log.Info().Int("days", n).Msg("daily settlement done")
			}
		}
	}
}
