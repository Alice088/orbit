package repository

import (
	"context"
	"errors"
	"orbit/internal/entity"
	"time"

	"github.com/jackc/pgx/v5"
)

type ExperimentRepo struct {
	q Querier
}

func NewExperimentRepo(q Querier) *ExperimentRepo {
	return &ExperimentRepo{q: q}
}

func (r *ExperimentRepo) CreateExperiment(ctx context.Context, e *entity.Experiment) error {
	row := r.q.QueryRow(ctx,
		`INSERT INTO experiments (user_id, title, category, tags)
		 VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
		e.UserID, e.Title, e.Category, e.Tags)
	return row.Scan(&e.ID, &e.CreatedAt)
}

func (r *ExperimentRepo) GetExperiment(ctx context.Context, id string) (*entity.Experiment, error) {
	row := r.q.QueryRow(ctx,
		`SELECT id, user_id, title, category, tags, created_at FROM experiments WHERE id = $1`, id)
	var e entity.Experiment
	if err := row.Scan(&e.ID, &e.UserID, &e.Title, &e.Category, &e.Tags, &e.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &e, nil
}

func (r *ExperimentRepo) ListExperimentsByUser(ctx context.Context, userID string) ([]entity.Experiment, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, user_id, title, category, tags, created_at FROM experiments
		 WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.Experiment
	for rows.Next() {
		var e entity.Experiment
		if err := rows.Scan(&e.ID, &e.UserID, &e.Title, &e.Category, &e.Tags, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *ExperimentRepo) UpdateExperiment(ctx context.Context, e *entity.Experiment) error {
	_, err := r.q.Exec(ctx,
		`UPDATE experiments SET title = $2, category = $3, tags = $4 WHERE id = $1`,
		e.ID, e.Title, e.Category, e.Tags)
	return err
}

func (r *ExperimentRepo) DeleteExperiment(ctx context.Context, id string) error {
	_, err := r.q.Exec(ctx, `DELETE FROM experiments WHERE id = $1`, id)
	return err
}

func (r *ExperimentRepo) CreateVersion(ctx context.Context, v *entity.ExperimentVersion) error {
	row := r.q.QueryRow(ctx,
		`INSERT INTO experiment_versions (experiment_id, version_number, change, success_criteria, duration_days, status)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
		v.ExperimentID, v.VersionNumber, v.Change, v.SuccessCriteria, v.DurationDays, v.Status)
	return row.Scan(&v.ID, &v.CreatedAt)
}

func (r *ExperimentRepo) GetVersion(ctx context.Context, id string) (*entity.ExperimentVersion, error) {
	row := r.q.QueryRow(ctx,
		`SELECT id, experiment_id, version_number, change, success_criteria, duration_days, status,
		        started_at, completed_at, reflection, created_at
		 FROM experiment_versions WHERE id = $1`, id)
	var v entity.ExperimentVersion
	if err := row.Scan(&v.ID, &v.ExperimentID, &v.VersionNumber, &v.Change, &v.SuccessCriteria,
		&v.DurationDays, &v.Status, &v.StartedAt, &v.CompletedAt, &v.Reflection, &v.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &v, nil
}

func (r *ExperimentRepo) VersionsByExperiment(ctx context.Context, experimentID string) ([]entity.ExperimentVersion, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, experiment_id, version_number, change, success_criteria, duration_days, status,
		        started_at, completed_at, reflection, created_at
		 FROM experiment_versions WHERE experiment_id = $1 ORDER BY version_number`, experimentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.ExperimentVersion
	for rows.Next() {
		var v entity.ExperimentVersion
		if err := rows.Scan(&v.ID, &v.ExperimentID, &v.VersionNumber, &v.Change, &v.SuccessCriteria,
			&v.DurationDays, &v.Status, &v.StartedAt, &v.CompletedAt, &v.Reflection, &v.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (r *ExperimentRepo) MaxVersionNumber(ctx context.Context, experimentID string) (int, error) {
	var n int
	err := r.q.QueryRow(ctx,
		`SELECT COALESCE(MAX(version_number), 0) FROM experiment_versions WHERE experiment_id = $1`,
		experimentID).Scan(&n)
	return n, err
}

func (r *ExperimentRepo) UpdateVersion(ctx context.Context, v *entity.ExperimentVersion) error {
	_, err := r.q.Exec(ctx,
		`UPDATE experiment_versions SET change = $2, success_criteria = $3, duration_days = $4,
		        status = $5, started_at = $6, completed_at = $7, reflection = $8
		 WHERE id = $1`,
		v.ID, v.Change, v.SuccessCriteria, v.DurationDays, v.Status, v.StartedAt, v.CompletedAt, v.Reflection)
	return err
}

func (r *ExperimentRepo) DeleteVersion(ctx context.Context, id string) error {
	_, err := r.q.Exec(ctx, `DELETE FROM experiment_versions WHERE id = $1`, id)
	return err
}

func (r *ExperimentRepo) ReplaceMetrics(ctx context.Context, versionID string, metrics []entity.ExperimentMetric) error {
	if _, err := r.q.Exec(ctx, `DELETE FROM experiment_metrics WHERE version_id = $1`, versionID); err != nil {
		return err
	}
	for i := range metrics {
		row := r.q.QueryRow(ctx,
			`INSERT INTO experiment_metrics (version_id, position, name, type, unit, direction, is_primary,
			        baseline_source, baseline_value, baseline_denom)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
			versionID, metrics[i].Position, metrics[i].Name, metrics[i].Type, metrics[i].Unit,
			metrics[i].Direction, metrics[i].IsPrimary, metrics[i].BaselineSource,
			metrics[i].BaselineValue, metrics[i].BaselineDenom)
		if err := row.Scan(&metrics[i].ID); err != nil {
			return err
		}
	}
	return nil
}

func (r *ExperimentRepo) MetricsByVersion(ctx context.Context, versionID string) ([]entity.ExperimentMetric, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, version_id, position, name, type, unit, direction, is_primary,
		        baseline_source, baseline_value, baseline_denom
		 FROM experiment_metrics WHERE version_id = $1 ORDER BY position`, versionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.ExperimentMetric
	for rows.Next() {
		var m entity.ExperimentMetric
		if err := rows.Scan(&m.ID, &m.VersionID, &m.Position, &m.Name, &m.Type, &m.Unit,
			&m.Direction, &m.IsPrimary, &m.BaselineSource, &m.BaselineValue, &m.BaselineDenom); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (r *ExperimentRepo) UpsertCheckin(ctx context.Context, c *entity.ExperimentCheckin) error {
	row := r.q.QueryRow(ctx,
		`INSERT INTO experiment_checkins (version_id, day, note)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (version_id, day) DO UPDATE SET note = EXCLUDED.note, updated_at = now()
		 RETURNING id, created_at, updated_at`,
		c.VersionID, c.Day, c.Note)
	return row.Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

func (r *ExperimentRepo) CheckinsByVersion(ctx context.Context, versionID string) ([]entity.ExperimentCheckin, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, version_id, day, note, created_at, updated_at
		 FROM experiment_checkins WHERE version_id = $1 ORDER BY day`, versionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.ExperimentCheckin
	for rows.Next() {
		var c entity.ExperimentCheckin
		if err := rows.Scan(&c.ID, &c.VersionID, &c.Day, &c.Note, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *ExperimentRepo) DeleteCheckin(ctx context.Context, versionID string, day time.Time) error {
	_, err := r.q.Exec(ctx,
		`DELETE FROM experiment_checkins WHERE version_id = $1 AND day = $2`, versionID, day)
	return err
}

func (r *ExperimentRepo) ReplaceCheckinValues(ctx context.Context, checkinID string, values []entity.ExperimentCheckinValue) error {
	if _, err := r.q.Exec(ctx, `DELETE FROM experiment_checkin_values WHERE checkin_id = $1`, checkinID); err != nil {
		return err
	}
	for i := range values {
		if _, err := r.q.Exec(ctx,
			`INSERT INTO experiment_checkin_values (checkin_id, metric_id, num_value, denom_value, text_value)
			 VALUES ($1, $2, $3, $4, $5)`,
			checkinID, values[i].MetricID, values[i].NumValue, values[i].DenomValue, values[i].TextValue); err != nil {
			return err
		}
	}
	return nil
}

func (r *ExperimentRepo) ValuesByCheckin(ctx context.Context, checkinID string) ([]entity.ExperimentCheckinValue, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, checkin_id, metric_id, num_value, denom_value, text_value
		 FROM experiment_checkin_values WHERE checkin_id = $1`, checkinID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.ExperimentCheckinValue
	for rows.Next() {
		var v entity.ExperimentCheckinValue
		if err := rows.Scan(&v.ID, &v.CheckinID, &v.MetricID, &v.NumValue, &v.DenomValue, &v.TextValue); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (r *ExperimentRepo) ValuesByVersion(ctx context.Context, versionID string) (map[string][]entity.ExperimentCheckinValue, error) {
	rows, err := r.q.Query(ctx,
		`SELECT v.id, v.checkin_id, v.metric_id, v.num_value, v.denom_value, v.text_value
		 FROM experiment_checkin_values v
		 JOIN experiment_checkins c ON c.id = v.checkin_id
		 WHERE c.version_id = $1 ORDER BY c.day, v.id`, versionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string][]entity.ExperimentCheckinValue{}
	for rows.Next() {
		var v entity.ExperimentCheckinValue
		if err := rows.Scan(&v.ID, &v.CheckinID, &v.MetricID, &v.NumValue, &v.DenomValue, &v.TextValue); err != nil {
			return nil, err
		}
		out[v.CheckinID] = append(out[v.CheckinID], v)
	}
	return out, rows.Err()
}

func (r *ExperimentRepo) RunningVersionInExperiment(ctx context.Context, experimentID string, excludeID string) (*entity.ExperimentVersion, error) {
	row := r.q.QueryRow(ctx,
		`SELECT id, experiment_id, version_number, change, success_criteria, duration_days, status,
		        started_at, completed_at, reflection, created_at
		 FROM experiment_versions
		 WHERE experiment_id = $1 AND status = 'running' AND id <> $2
		 LIMIT 1`, experimentID, excludeID)
	var v entity.ExperimentVersion
	if err := row.Scan(&v.ID, &v.ExperimentID, &v.VersionNumber, &v.Change, &v.SuccessCriteria,
		&v.DurationDays, &v.Status, &v.StartedAt, &v.CompletedAt, &v.Reflection, &v.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &v, nil
}
