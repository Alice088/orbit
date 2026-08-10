CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_experiments_user ON experiments(user_id);

CREATE TABLE experiment_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    change TEXT NOT NULL DEFAULT '',
    success_criteria TEXT NOT NULL DEFAULT '',
    duration_days INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    started_at DATE,
    completed_at DATE,
    reflection TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (experiment_id, version_number)
);

CREATE INDEX idx_experiment_versions_experiment ON experiment_versions(experiment_id);

CREATE TABLE experiment_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES experiment_versions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT '',
    direction TEXT NOT NULL DEFAULT '',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    baseline_source TEXT NOT NULL DEFAULT 'none',
    baseline_value NUMERIC,
    baseline_denom NUMERIC,
    UNIQUE (version_id, position)
);

CREATE INDEX idx_experiment_metrics_version ON experiment_metrics(version_id);

CREATE TABLE experiment_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES experiment_versions(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (version_id, day)
);

CREATE INDEX idx_experiment_checkins_version ON experiment_checkins(version_id);

CREATE TABLE experiment_checkin_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkin_id UUID NOT NULL REFERENCES experiment_checkins(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES experiment_metrics(id) ON DELETE CASCADE,
    num_value NUMERIC,
    denom_value NUMERIC,
    text_value TEXT,
    UNIQUE (checkin_id, metric_id)
);
