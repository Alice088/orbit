package service

import (
	"context"
	"errors"
	"orbit/internal/dto"
	"orbit/internal/entity"
	"orbit/internal/repository"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

var (
	ErrExperimentVersionLocked = errors.New("версия уже запущена — менять нельзя")
	ErrExperimentRunningExists = errors.New("в этом эксперименте уже есть активная версия")
	ErrCheckinNotAllowed       = errors.New("чек-ины доступны только во время забега")
	ErrCheckinWindowClosed     = errors.New("день вне окна эксперимента")
	ErrCheckinFuture           = errors.New("нельзя отметить будущий день")
	ErrVersionNotEnded         = errors.New("версия ещё не завершена")
	ErrPrimaryRequired         = errors.New("нужна ровно одна главная метрика")
	ErrVersionInUse            = errors.New("можно удалить только черновик")
)

func (s *Service) CreateExperiment(ctx context.Context, userID string, in dto.CreateExperimentRequest) (*dto.ExperimentResponse, error) {
	title := strings.TrimSpace(in.Title)
	if title == "" {
		return nil, ErrValidation
	}
	duration := in.DurationDays
	if duration < 1 {
		duration = 7
	}
	if duration > 365 {
		return nil, ErrValidation
	}
	metrics, err := validateMetricInputs(in.Metrics)
	if err != nil {
		return nil, err
	}
	exp := &entity.Experiment{UserID: userID, Title: title}
	err = s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		if err := store.Experiment.CreateExperiment(ctx, exp); err != nil {
			return err
		}
		v := &entity.ExperimentVersion{
			ExperimentID:    exp.ID,
			VersionNumber:   1,
			Change:          in.Change,
			SuccessCriteria: in.SuccessCriteria,
			DurationDays:    duration,
			Status:          entity.ExperimentStatusDraft,
		}
		if err := store.Experiment.CreateVersion(ctx, v); err != nil {
			return err
		}
		if len(metrics) > 0 {
			if err := store.Experiment.ReplaceMetrics(ctx, v.ID, metrics); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.ExperimentDetail(ctx, userID, exp.ID)
}

func (s *Service) ListExperiments(ctx context.Context, userID string) ([]dto.ExperimentResponse, error) {
	store := repository.NewStore(s.pool)
	exps, err := store.Experiment.ListExperimentsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ExperimentResponse, 0, len(exps))
	for i := range exps {
		resp, err := s.experimentPayload(ctx, store, &exps[i], true)
		if err != nil {
			return nil, err
		}
		out = append(out, *resp)
	}
	return out, nil
}

func (s *Service) ExperimentDetail(ctx context.Context, userID string, experimentID string) (*dto.ExperimentResponse, error) {
	store := repository.NewStore(s.pool)
	exp, err := store.Experiment.GetExperiment(ctx, experimentID)
	if err != nil {
		return nil, err
	}
	if exp.UserID != userID {
		return nil, ErrWrongOwner
	}
	return s.experimentPayload(ctx, store, exp, true)
}

func (s *Service) UpdateExperiment(ctx context.Context, userID string, experimentID string, in dto.UpdateExperimentRequest) error {
	title := strings.TrimSpace(in.Title)
	if title == "" {
		return ErrValidation
	}
	return s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		exp, err := store.Experiment.GetExperiment(ctx, experimentID)
		if err != nil {
			return err
		}
		if exp.UserID != userID {
			return ErrWrongOwner
		}
		exp.Title = title
		return store.Experiment.UpdateExperiment(ctx, exp)
	})
}

func (s *Service) DeleteExperiment(ctx context.Context, userID string, experimentID string) error {
	return s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		exp, err := store.Experiment.GetExperiment(ctx, experimentID)
		if err != nil {
			return err
		}
		if exp.UserID != userID {
			return ErrWrongOwner
		}
		return store.Experiment.DeleteExperiment(ctx, experimentID)
	})
}

func (s *Service) ForkVersion(ctx context.Context, userID string, experimentID string) (*dto.VersionResponse, error) {
	today := s.today()
	var out *dto.VersionResponse
	err := s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		exp, err := store.Experiment.GetExperiment(ctx, experimentID)
		if err != nil {
			return err
		}
		if exp.UserID != userID {
			return ErrWrongOwner
		}
		versions, err := store.Experiment.VersionsByExperiment(ctx, experimentID)
		if err != nil {
			return err
		}
		if len(versions) == 0 {
			return ErrValidation
		}
		latest := versions[len(versions)-1]
		if latest.Status == entity.ExperimentStatusDraft {
			out, err = s.versionPayload(ctx, store, experimentID, &latest, today)
			return err
		}
		source := latest
		metrics, err := store.Experiment.MetricsByVersion(ctx, source.ID)
		if err != nil {
			return err
		}
		maxN, err := store.Experiment.MaxVersionNumber(ctx, experimentID)
		if err != nil {
			return err
		}
		v := &entity.ExperimentVersion{
			ExperimentID:    experimentID,
			VersionNumber:   maxN + 1,
			Change:          source.Change,
			SuccessCriteria: source.SuccessCriteria,
			DurationDays:    source.DurationDays,
			Status:          entity.ExperimentStatusDraft,
		}
		if err := store.Experiment.CreateVersion(ctx, v); err != nil {
			return err
		}
		if len(metrics) > 0 {
			if err := store.Experiment.ReplaceMetrics(ctx, v.ID, metrics); err != nil {
				return err
			}
		}
		if source.Status == entity.ExperimentStatusRunning {
			source.Status = entity.ExperimentStatusAborted
			if err := store.Experiment.UpdateVersion(ctx, &source); err != nil {
				return err
			}
		}
		out, err = s.versionPayload(ctx, store, experimentID, v, today)
		return err
	})
	return out, err
}

func (s *Service) UpdateVersion(ctx context.Context, userID string, experimentID string, versionID string, in dto.UpdateVersionRequest) error {
	if in.DurationDays < 1 || in.DurationDays > 365 {
		return ErrValidation
	}
	metrics, err := validateMetricInputs(in.Metrics)
	if err != nil {
		return err
	}
	return s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		exp, err := store.Experiment.GetExperiment(ctx, experimentID)
		if err != nil {
			return err
		}
		if exp.UserID != userID {
			return ErrWrongOwner
		}
		v, err := store.Experiment.GetVersion(ctx, versionID)
		if err != nil {
			return err
		}
		if v.ExperimentID != experimentID {
			return ErrWrongOwner
		}
		if v.Status != entity.ExperimentStatusDraft {
			return ErrExperimentVersionLocked
		}
		v.Change = in.Change
		v.SuccessCriteria = in.SuccessCriteria
		v.DurationDays = in.DurationDays
		if err := store.Experiment.UpdateVersion(ctx, v); err != nil {
			return err
		}
		if len(metrics) > 0 {
			return store.Experiment.ReplaceMetrics(ctx, v.ID, metrics)
		}
		return nil
	})
}

func (s *Service) DeleteVersion(ctx context.Context, userID string, experimentID string, versionID string) error {
	return s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		exp, err := store.Experiment.GetExperiment(ctx, experimentID)
		if err != nil {
			return err
		}
		if exp.UserID != userID {
			return ErrWrongOwner
		}
		v, err := store.Experiment.GetVersion(ctx, versionID)
		if err != nil {
			return err
		}
		if v.ExperimentID != experimentID {
			return ErrWrongOwner
		}
		if v.Status != entity.ExperimentStatusDraft {
			return ErrVersionInUse
		}
		return store.Experiment.DeleteVersion(ctx, versionID)
	})
}

func (s *Service) StartVersion(ctx context.Context, userID string, experimentID string, versionID string) (*dto.VersionResponse, error) {
	today := s.today()
	var out *dto.VersionResponse
	err := s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		exp, err := store.Experiment.GetExperiment(ctx, experimentID)
		if err != nil {
			return err
		}
		if exp.UserID != userID {
			return ErrWrongOwner
		}
		v, err := store.Experiment.GetVersion(ctx, versionID)
		if err != nil {
			return err
		}
		if v.ExperimentID != experimentID {
			return ErrWrongOwner
		}
		if v.Status != entity.ExperimentStatusDraft {
			return ErrExperimentVersionLocked
		}
		if strings.TrimSpace(v.Change) == "" {
			return ErrValidation
		}
		metrics, err := store.Experiment.MetricsByVersion(ctx, v.ID)
		if err != nil {
			return err
		}
		if len(metrics) == 0 {
			return ErrValidation
		}
		primaryCount := 0
		for _, m := range metrics {
			if m.IsPrimary {
				primaryCount++
			}
		}
		if primaryCount != 1 {
			return ErrPrimaryRequired
		}
		other, err := store.Experiment.RunningVersionInExperiment(ctx, experimentID, v.ID)
		if err != nil {
			return err
		}
		if other != nil {
			return ErrExperimentRunningExists
		}
		started := today
		v.Status = entity.ExperimentStatusRunning
		v.StartedAt = &started
		if err := store.Experiment.UpdateVersion(ctx, v); err != nil {
			return err
		}
		out, err = s.versionPayload(ctx, store, experimentID, v, today)
		return err
	})
	return out, err
}

func (s *Service) VersionDetail(ctx context.Context, userID string, experimentID string, versionID string) (*dto.VersionResponse, error) {
	store := repository.NewStore(s.pool)
	exp, err := store.Experiment.GetExperiment(ctx, experimentID)
	if err != nil {
		return nil, err
	}
	if exp.UserID != userID {
		return nil, ErrWrongOwner
	}
	v, err := store.Experiment.GetVersion(ctx, versionID)
	if err != nil {
		return nil, err
	}
	if v.ExperimentID != experimentID {
		return nil, ErrWrongOwner
	}
	return s.versionPayload(ctx, store, experimentID, v, s.today())
}

func (s *Service) UpsertCheckin(ctx context.Context, userID string, experimentID string, versionID string, day string, in dto.UpsertCheckinRequest) (*dto.VersionResponse, error) {
	today := s.today()
	parsed, err := time.Parse("2006-01-02", day)
	if err != nil {
		return nil, ErrValidation
	}
	parsed = s.dayOf(parsed)
	var out *dto.VersionResponse
	err = s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		exp, err := store.Experiment.GetExperiment(ctx, experimentID)
		if err != nil {
			return err
		}
		if exp.UserID != userID {
			return ErrWrongOwner
		}
		v, err := store.Experiment.GetVersion(ctx, versionID)
		if err != nil {
			return err
		}
		if v.ExperimentID != experimentID {
			return ErrWrongOwner
		}
		status := versionEffectiveStatus(v, today)
		if status != entity.ExperimentStatusRunning {
			return ErrCheckinNotAllowed
		}
		if parsed.After(today) {
			return ErrCheckinFuture
		}
		lastDay, ok := runLastDay(v)
		if !ok || parsed.Before(s.dayOf(*v.StartedAt)) || parsed.After(lastDay) {
			return ErrCheckinWindowClosed
		}
		metrics, err := store.Experiment.MetricsByVersion(ctx, v.ID)
		if err != nil {
			return err
		}
		byMetric := make(map[string]entity.ExperimentMetric, len(metrics))
		for _, m := range metrics {
			byMetric[m.ID] = m
		}
		values := make([]entity.ExperimentCheckinValue, 0, len(in.Values))
		seen := map[string]bool{}
		primaryFilled := false
		for _, item := range in.Values {
			m, ok := byMetric[item.MetricID]
			if !ok {
				return ErrValidation
			}
			if seen[item.MetricID] {
				return ErrValidation
			}
			seen[item.MetricID] = true
			val, err := validateCheckinValue(m, item)
			if err != nil {
				return err
			}
			values = append(values, val)
			if m.IsPrimary && val.NumValue != nil {
				primaryFilled = true
			}
		}
		for _, m := range metrics {
			if m.IsPrimary && !primaryFilled {
				return ErrPrimaryRequired
			}
		}
		c := &entity.ExperimentCheckin{VersionID: v.ID, Day: parsed, Note: in.Note}
		if err := store.Experiment.UpsertCheckin(ctx, c); err != nil {
			return err
		}
		if err := store.Experiment.ReplaceCheckinValues(ctx, c.ID, values); err != nil {
			return err
		}
		out, err = s.versionPayload(ctx, store, experimentID, v, today)
		return err
	})
	return out, err
}

func (s *Service) DeleteCheckin(ctx context.Context, userID string, experimentID string, versionID string, day string) error {
	parsed, err := time.Parse("2006-01-02", day)
	if err != nil {
		return ErrValidation
	}
	return s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		exp, err := store.Experiment.GetExperiment(ctx, experimentID)
		if err != nil {
			return err
		}
		if exp.UserID != userID {
			return ErrWrongOwner
		}
		v, err := store.Experiment.GetVersion(ctx, versionID)
		if err != nil {
			return err
		}
		if v.ExperimentID != experimentID {
			return ErrWrongOwner
		}
		return store.Experiment.DeleteCheckin(ctx, v.ID, s.dayOf(parsed))
	})
}

func (s *Service) SubmitReflection(ctx context.Context, userID string, experimentID string, versionID string, reflection string) (*dto.VersionResponse, error) {
	today := s.today()
	var out *dto.VersionResponse
	err := s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		exp, err := store.Experiment.GetExperiment(ctx, experimentID)
		if err != nil {
			return err
		}
		if exp.UserID != userID {
			return ErrWrongOwner
		}
		v, err := store.Experiment.GetVersion(ctx, versionID)
		if err != nil {
			return err
		}
		if v.ExperimentID != experimentID {
			return ErrWrongOwner
		}
		switch v.Status {
		case entity.ExperimentStatusCompleted:
			v.Reflection = reflection
		case entity.ExperimentStatusRunning:
			lastDay, ok := runLastDay(v)
			if !ok || !today.After(lastDay) {
				return ErrVersionNotEnded
			}
			v.Reflection = reflection
			v.Status = entity.ExperimentStatusCompleted
			completed := today
			v.CompletedAt = &completed
		default:
			return ErrVersionNotEnded
		}
		if err := store.Experiment.UpdateVersion(ctx, v); err != nil {
			return err
		}
		out, err = s.versionPayload(ctx, store, experimentID, v, today)
		return err
	})
	return out, err
}

func validateMetricInputs(in []dto.MetricInput) ([]entity.ExperimentMetric, error) {
	if len(in) == 0 {
		return nil, nil
	}
	if len(in) > 12 {
		return nil, ErrValidation
	}
	out := make([]entity.ExperimentMetric, 0, len(in))
	primaryCount := 0
	for i, item := range in {
		m, err := validateMetricInput(item, i+1)
		if err != nil {
			return nil, err
		}
		if m.IsPrimary {
			primaryCount++
		}
		out = append(out, m)
	}
	if primaryCount > 1 {
		return nil, ErrPrimaryRequired
	}
	return out, nil
}

func validateMetricInput(in dto.MetricInput, pos int) (entity.ExperimentMetric, error) {
	m := entity.ExperimentMetric{
		Position:       pos,
		Name:           strings.TrimSpace(in.Name),
		Type:           entity.MetricType(strings.TrimSpace(in.Type)),
		Unit:           strings.TrimSpace(in.Unit),
		IsPrimary:      in.IsPrimary,
		BaselineSource: entity.BaselineSource(strings.TrimSpace(in.BaselineSource)),
		BaselineValue:  in.BaselineValue,
		BaselineDenom:  in.BaselineDenom,
	}
	if m.Name == "" {
		return m, ErrValidation
	}
	switch m.Type {
	case entity.MetricTypeCount, entity.MetricTypeDuration, entity.MetricTypeRate,
		entity.MetricTypeScore, entity.MetricTypeBinary, entity.MetricTypeNote:
	default:
		return m, ErrValidation
	}
	if m.BaselineSource == "" {
		m.BaselineSource = entity.BaselineSourceNone
	}
	switch m.BaselineSource {
	case entity.BaselineSourceNone, entity.BaselineSourceManual, entity.BaselineSourceMeasured:
	default:
		return m, ErrValidation
	}
	if m.BaselineSource == entity.BaselineSourceNone {
		m.BaselineValue = nil
		m.BaselineDenom = nil
	}
	switch in.Direction {
	case string(entity.MetricDirectionHigher):
		m.Direction = entity.MetricDirectionHigher
	case string(entity.MetricDirectionLower):
		m.Direction = entity.MetricDirectionLower
	default:
		m.Direction = ""
	}
	if m.Type == entity.MetricTypeNote {
		if m.IsPrimary {
			return m, ErrValidation
		}
		m.Direction = ""
		m.BaselineSource = entity.BaselineSourceNone
		m.BaselineValue = nil
		m.BaselineDenom = nil
		return m, nil
	}
	if err := validateBaseline(m); err != nil {
		return m, err
	}
	if m.IsPrimary && m.Direction == "" {
		return m, ErrValidation
	}
	return m, nil
}

func validateBaseline(m entity.ExperimentMetric) error {
	if m.BaselineSource == entity.BaselineSourceNone {
		return nil
	}
	if m.BaselineValue == nil {
		return ErrValidation
	}
	switch m.Type {
	case entity.MetricTypeCount, entity.MetricTypeDuration:
		if *m.BaselineValue < 0 {
			return ErrValidation
		}
	case entity.MetricTypeRate:
		if m.BaselineDenom == nil || *m.BaselineDenom <= 0 || *m.BaselineValue < 0 || *m.BaselineValue > *m.BaselineDenom {
			return ErrValidation
		}
	case entity.MetricTypeScore:
		if *m.BaselineValue < 1 || *m.BaselineValue > 5 {
			return ErrValidation
		}
	case entity.MetricTypeBinary:
		if *m.BaselineValue != 0 && *m.BaselineValue != 1 {
			return ErrValidation
		}
	}
	return nil
}

func validateCheckinValue(m entity.ExperimentMetric, in dto.CheckinValueInput) (entity.ExperimentCheckinValue, error) {
	v := entity.ExperimentCheckinValue{
		MetricID:   in.MetricID,
		NumValue:   in.NumValue,
		DenomValue: in.DenomValue,
		TextValue:  in.TextValue,
	}
	switch m.Type {
	case entity.MetricTypeNote:
		if v.NumValue != nil || v.DenomValue != nil {
			return v, ErrValidation
		}
		if v.TextValue == nil || strings.TrimSpace(*v.TextValue) == "" {
			return v, ErrValidation
		}
	case entity.MetricTypeCount, entity.MetricTypeDuration:
		if v.NumValue == nil || *v.NumValue < 0 || v.DenomValue != nil {
			return v, ErrValidation
		}
	case entity.MetricTypeScore:
		if v.NumValue == nil || *v.NumValue < 1 || *v.NumValue > 5 {
			return v, ErrValidation
		}
	case entity.MetricTypeBinary:
		if v.NumValue == nil || (*v.NumValue != 0 && *v.NumValue != 1) {
			return v, ErrValidation
		}
	case entity.MetricTypeRate:
		if v.NumValue == nil || *v.NumValue < 0 || v.DenomValue == nil || *v.DenomValue <= 0 || *v.NumValue > *v.DenomValue {
			return v, ErrValidation
		}
	}
	return v, nil
}

func runLastDay(v *entity.ExperimentVersion) (time.Time, bool) {
	if v.StartedAt == nil {
		return time.Time{}, false
	}
	start := dayOfUTC(*v.StartedAt)
	return start.AddDate(0, 0, v.DurationDays-1), true
}

func dayOfUTC(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

func versionEffectiveStatus(v *entity.ExperimentVersion, today time.Time) entity.ExperimentStatus {
	switch v.Status {
	case entity.ExperimentStatusRunning:
		lastDay, ok := runLastDay(v)
		if ok && today.After(lastDay) {
			return entity.ExperimentStatusCompleted
		}
		return entity.ExperimentStatusRunning
	default:
		return v.Status
	}
}

func (s *Service) experimentPayload(ctx context.Context, store *repository.Store, exp *entity.Experiment, includeVersions bool) (*dto.ExperimentResponse, error) {
	today := s.today()
	versions, err := store.Experiment.VersionsByExperiment(ctx, exp.ID)
	if err != nil {
		return nil, err
	}
	resp := &dto.ExperimentResponse{
		ID: exp.ID, Title: exp.Title, CreatedAt: exp.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	bestID, bestChange := s.familyBest(ctx, store, exp.ID)
	summaries := make([]dto.VersionSummaryResponse, 0, len(versions))
	for i := range versions {
		v := &versions[i]
		payload, err := s.versionPayload(ctx, store, exp.ID, v, today)
		if err != nil {
			return nil, err
		}
		status := versionEffectiveStatus(v, today)
		switch status {
		case entity.ExperimentStatusRunning:
			resp.ActiveCount++
		case entity.ExperimentStatusCompleted:
			resp.CompletedCount++
		case entity.ExperimentStatusAborted:
			resp.AbortedCount++
		}
		resp.TotalVersions++
		sum := dto.VersionSummaryResponse{
			ID:            v.ID,
			VersionNumber: v.VersionNumber,
			Change:        v.Change,
			Status:        string(status),
			DurationDays:  v.DurationDays,
			DayIndex:      payload.DayIndex,
			DaysLeft:      payload.DaysLeft,
			PrimarySummary: payload.PrimarySummary,
			IsBest:        v.ID == bestID,
			IsCurrent:     v.VersionNumber == versions[len(versions)-1].VersionNumber,
		}
		if sum.IsBest && bestChange != nil {
			cp := bestChange
			resp.Best = &dto.BestResponse{VersionID: v.ID, ChangePct: cp}
		}
		summaries = append(summaries, sum)
		if sum.IsCurrent {
			cur := sum
			resp.Current = &cur
		}
	}
	if includeVersions {
		resp.Versions = summaries
	}
	return resp, nil
}

func (s *Service) familyBest(ctx context.Context, store *repository.Store, experimentID string) (string, *float64) {
	versions, err := store.Experiment.VersionsByExperiment(ctx, experimentID)
	if err != nil {
		return "", nil
	}
	type key struct {
		metricType entity.MetricType
		unit       string
		direction  entity.MetricDirection
	}
	best := map[key]struct {
		versionID string
		score     float64
		changePct float64
		has       bool
	}{}
	for i := range versions {
		v := &versions[i]
		if v.Status != entity.ExperimentStatusCompleted {
			continue
		}
		metrics, err := store.Experiment.MetricsByVersion(ctx, v.ID)
		if err != nil {
			continue
		}
		primary, ok := primaryMetric(metrics)
		if !ok || primary.BaselineValue == nil {
			continue
		}
		stats, err := s.metricStats(ctx, store, v.ID, primary, v.DurationDays)
		if err != nil || stats.Average == nil {
			continue
		}
		baseline := *primary.BaselineValue
		if primary.Type == entity.MetricTypeRate && primary.BaselineDenom != nil && *primary.BaselineDenom > 0 {
			baseline = baseline / *primary.BaselineDenom
		}
		changePct := (*stats.Average - baseline) / baseline * 100
		score := changePct
		if primary.Direction == entity.MetricDirectionLower {
			score = -changePct
		}
		k := key{primary.Type, primary.Unit, primary.Direction}
		if !best[k].has || score > best[k].score {
			best[k] = struct {
				versionID string
				score     float64
				changePct float64
				has       bool
			}{v.ID, score, changePct, true}
		}
	}
	var bestVersion string
	var bestScore float64
	var bestChange *float64
	hasBest := false
	for _, b := range best {
		if !b.has {
			continue
		}
		if !hasBest || b.score > bestScore {
			bestVersion = b.versionID
			bestScore = b.score
			cp := b.changePct
			bestChange = &cp
			hasBest = true
		}
	}
	if !hasBest {
		return "", nil
	}
	return bestVersion, bestChange
}

func primaryMetric(metrics []entity.ExperimentMetric) (entity.ExperimentMetric, bool) {
	for _, m := range metrics {
		if m.IsPrimary {
			return m, true
		}
	}
	return entity.ExperimentMetric{}, false
}

func (s *Service) versionPayload(ctx context.Context, store *repository.Store, experimentID string, v *entity.ExperimentVersion, today time.Time) (*dto.VersionResponse, error) {
	metrics, err := store.Experiment.MetricsByVersion(ctx, v.ID)
	if err != nil {
		return nil, err
	}
	checkins, err := store.Experiment.CheckinsByVersion(ctx, v.ID)
	if err != nil {
		return nil, err
	}
	valuesByCheckin, err := store.Experiment.ValuesByVersion(ctx, v.ID)
	if err != nil {
		return nil, err
	}
	status := versionEffectiveStatus(v, today)
	resp := &dto.VersionResponse{
		ID:              v.ID,
		ExperimentID:    experimentID,
		VersionNumber:   v.VersionNumber,
		Change:          v.Change,
		SuccessCriteria: v.SuccessCriteria,
		DurationDays:    v.DurationDays,
		Status:          string(status),
		Reflection:      v.Reflection,
	}
	if v.StartedAt != nil {
		t := v.StartedAt.Format("2006-01-02")
		resp.StartedAt = &t
	}
	if v.CompletedAt != nil {
		t := v.CompletedAt.Format("2006-01-02")
		resp.CompletedAt = &t
	}
	if lastDay, ok := runLastDay(v); ok {
		start := dayOfUTC(*v.StartedAt)
		dayIndex := int(today.Sub(start).Hours()/24) + 1
		if dayIndex < 1 {
			dayIndex = 1
		}
		if dayIndex > v.DurationDays {
			dayIndex = v.DurationDays
		}
		resp.DayIndex = dayIndex
		daysLeft := int(lastDay.Sub(today).Hours() / 24)
		if daysLeft < 0 {
			daysLeft = 0
		}
		resp.DaysLeft = daysLeft
	}
	for i := range metrics {
		m := &metrics[i]
		stats, err := s.metricStats(ctx, store, v.ID, *m, v.DurationDays)
		if err != nil {
			return nil, err
		}
		mResp := dto.MetricResponse{
			ID:             m.ID,
			Name:           m.Name,
			Type:           string(m.Type),
			Unit:           m.Unit,
			Direction:      string(m.Direction),
			IsPrimary:      m.IsPrimary,
			BaselineSource: string(m.BaselineSource),
			BaselineValue:  m.BaselineValue,
			BaselineDenom:  m.BaselineDenom,
			Stats:          stats,
		}
		if status == entity.ExperimentStatusDraft && m.BaselineSource == entity.BaselineSourceNone {
			sugg := s.baselineSuggestion(ctx, store, experimentID, v.ID, *m)
			if sugg != nil {
				mResp.SuggestedBaseline = sugg
			}
		}
		resp.Metrics = append(resp.Metrics, mResp)
	}
	for i := range checkins {
		c := &checkins[i]
		cResp := dto.CheckinResponse{
			ID:   c.ID,
			Day:  c.Day.Format("2006-01-02"),
			Note: c.Note,
		}
		for _, val := range valuesByCheckin[c.ID] {
			cResp.Values = append(cResp.Values, dto.CheckinValueResponse{
				MetricID:   val.MetricID,
				NumValue:   val.NumValue,
				DenomValue: val.DenomValue,
				TextValue:  val.TextValue,
			})
		}
		resp.Checkins = append(resp.Checkins, cResp)
	}
	primary, ok := primaryMetric(metrics)
	if ok {
		if stats := metricStatsOf(resp.Metrics, primary.ID); stats != nil {
			avg := stats.Average
			cp := stats.ChangePct
			resp.PrimarySummary = &dto.PrimarySummary{
				MetricName:  primary.Name,
				Average:     avg,
				ChangePct:   cp,
				Consistency: stats.Consistency,
			}
		}
		if status == entity.ExperimentStatusCompleted {
			resp.Verdict = s.computeVerdict(primary, resp.Metrics)
		}
	}
	return resp, nil
}

func metricStatsOf(metrics []dto.MetricResponse, metricID string) *dto.MetricStatsResponse {
	for i := range metrics {
		if metrics[i].ID == metricID {
			return metrics[i].Stats
		}
	}
	return nil
}

func (s *Service) computeVerdict(primary entity.ExperimentMetric, metrics []dto.MetricResponse) *dto.VerdictResponse {
	stats := metricStatsOf(metrics, primary.ID)
	out := &dto.VerdictResponse{PrimaryMetricID: primary.ID, MetricName: primary.Name}
	if stats == nil {
		out.Outcome = "no_data"
		return out
	}
	if stats.ValueCount == 0 {
		out.Outcome = "no_data"
		return out
	}
	if stats.ChangePct == nil {
		out.Outcome = "no_baseline"
		return out
	}
	cp := *stats.ChangePct
	out.ChangePct = &cp
	score := cp
	if primary.Direction == entity.MetricDirectionLower {
		score = -cp
	}
	switch {
	case score > 0.05:
		out.Outcome = "improved"
	case score < -0.05:
		out.Outcome = "worsened"
	default:
		out.Outcome = "neutral"
	}
	return out
}

func (s *Service) metricStats(ctx context.Context, store *repository.Store, versionID string, m entity.ExperimentMetric, durationDays int) (*dto.MetricStatsResponse, error) {
	checkins, err := store.Experiment.CheckinsByVersion(ctx, versionID)
	if err != nil {
		return nil, err
	}
	valuesByCheckin, err := store.Experiment.ValuesByVersion(ctx, versionID)
	if err != nil {
		return nil, err
	}
	out := &dto.MetricStatsResponse{Consistency: 0, ValueCount: 0}
	if m.Type == entity.MetricTypeNote {
		out.Consistency = float64(len(checkins)) / float64(durationDays)
		return out, nil
	}
	var series []float64
	for i := range checkins {
		for _, val := range valuesByCheckin[checkins[i].ID] {
			if val.MetricID != m.ID || val.NumValue == nil {
				continue
			}
			switch m.Type {
			case entity.MetricTypeRate:
				if val.DenomValue == nil || *val.DenomValue <= 0 {
					continue
				}
				series = append(series, *val.NumValue / *val.DenomValue)
			default:
				series = append(series, *val.NumValue)
			}
		}
	}
	out.Consistency = float64(len(checkins)) / float64(durationDays)
	out.ValueCount = len(series)
	if len(series) == 0 {
		return out, nil
	}
	avg, minV, maxV := summarize(series)
	out.Average = &avg
	out.Min = &minV
	out.Max = &maxV
	if len(series) > 1 {
		trendBetter := halvesTrend(series, m.Direction)
		out.TrendBetter = &trendBetter
	}
	if m.BaselineSource != entity.BaselineSourceNone && m.BaselineValue != nil {
		baseline := *m.BaselineValue
		if m.Type == entity.MetricTypeRate && m.BaselineDenom != nil && *m.BaselineDenom > 0 {
			baseline = baseline / *m.BaselineDenom
		}
		if baseline != 0 {
			cp := (avg - baseline) / baseline * 100
			out.ChangePct = &cp
		}
	}
	return out, nil
}

func summarize(series []float64) (avg float64, minV float64, maxV float64) {
	sum := 0.0
	minV = series[0]
	maxV = series[0]
	for _, v := range series {
		sum += v
		if v < minV {
			minV = v
		}
		if v > maxV {
			maxV = v
		}
	}
	return sum / float64(len(series)), minV, maxV
}

func halvesTrend(series []float64, direction entity.MetricDirection) bool {
	mid := len(series) / 2
	first, second := series[:mid], series[mid:]
	avgFirst, _, _ := summarize(first)
	avgSecond, _, _ := summarize(second)
	if direction == entity.MetricDirectionLower {
		return avgSecond < avgFirst
	}
	return avgSecond > avgFirst
}

func (s *Service) baselineSuggestion(ctx context.Context, store *repository.Store, experimentID string, excludeVersionID string, m entity.ExperimentMetric) *float64 {
	versions, err := store.Experiment.VersionsByExperiment(ctx, experimentID)
	if err != nil {
		return nil
	}
	var values []float64
	for i := range versions {
		v := &versions[i]
		if v.ID == excludeVersionID || v.Status != entity.ExperimentStatusCompleted {
			continue
		}
		metrics, err := store.Experiment.MetricsByVersion(ctx, v.ID)
		if err != nil {
			continue
		}
		for _, cand := range metrics {
			if cand.Name != m.Name || cand.Type != m.Type || cand.Unit != m.Unit {
				continue
			}
			checkins, err := store.Experiment.CheckinsByVersion(ctx, v.ID)
			if err != nil {
				continue
			}
			valuesByCheckin, err := store.Experiment.ValuesByVersion(ctx, v.ID)
			if err != nil {
				continue
			}
			for _, c := range checkins {
				for _, val := range valuesByCheckin[c.ID] {
					if val.MetricID != cand.ID || val.NumValue == nil {
						continue
					}
					if m.Type == entity.MetricTypeRate {
						if val.DenomValue == nil || *val.DenomValue <= 0 {
							continue
						}
						values = append(values, *val.NumValue / *val.DenomValue)
					} else {
						values = append(values, *val.NumValue)
					}
				}
			}
		}
	}
	if len(values) == 0 {
		return nil
	}
	avg, _, _ := summarize(values)
	return &avg
}
