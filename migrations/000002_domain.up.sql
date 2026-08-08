CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    total_gpp INTEGER NOT NULL CHECK (total_gpp > 0),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_goals_user ON goals(user_id);

CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    percent INTEGER NOT NULL CHECK (percent >= 0 AND percent <= 100),
    reward_points INTEGER NOT NULL CHECK (reward_points >= 0),
    UNIQUE (goal_id, percent)
);

CREATE INDEX idx_milestones_goal ON milestones(goal_id);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    goal_id UUID NOT NULL REFERENCES goals(id),
    milestone_from_id UUID NOT NULL REFERENCES milestones(id),
    milestone_to_id UUID NOT NULL REFERENCES milestones(id),
    title TEXT NOT NULL,
    contribution_coef INTEGER NOT NULL DEFAULT 100 CHECK (contribution_coef BETWEEN 50 AND 100),
    difficulty TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_goal ON tasks(goal_id);

CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    base_xp INTEGER NOT NULL CHECK (base_xp > 0),
    streak_tracking BOOLEAN NOT NULL DEFAULT true,
    category TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_habits_user ON habits(user_id);

CREATE TABLE habit_streak_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    days INTEGER NOT NULL CHECK (days > 0),
    bonus_xp INTEGER NOT NULL CHECK (bonus_xp > 0),
    achievement_code TEXT,
    UNIQUE (habit_id, days)
);

CREATE INDEX idx_habit_milestones ON habit_streak_milestones(habit_id);

CREATE TABLE streaks (
    user_id UUID NOT NULL REFERENCES users(id),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    current_days INTEGER NOT NULL DEFAULT 0,
    longest_days INTEGER NOT NULL DEFAULT 0,
    misses_in_row INTEGER NOT NULL DEFAULT 0,
    last_success_date DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, habit_id)
);

CREATE TABLE domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID,
    payload JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_domain_events_user_time ON domain_events(user_id, occurred_at DESC);

CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    currency TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    goal_id UUID REFERENCES goals(id),
    domain_event_id UUID REFERENCES domain_events(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tx_user_time ON point_transactions(user_id, created_at DESC);
CREATE INDEX idx_tx_event ON point_transactions(domain_event_id);
CREATE INDEX idx_tx_goal ON point_transactions(goal_id);

CREATE TABLE day_settlements (
    user_id UUID NOT NULL REFERENCES users(id),
    day DATE NOT NULL,
    settled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, day)
);

CREATE TABLE daily_stats (
    user_id UUID NOT NULL REFERENCES users(id),
    day DATE NOT NULL,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    habit_xp INTEGER NOT NULL DEFAULT 0,
    task_xp INTEGER NOT NULL DEFAULT 0,
    penalty_xp INTEGER NOT NULL DEFAULT 0,
    gpp_earned INTEGER NOT NULL DEFAULT 0,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    habits_completed INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    code TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, code)
);

CREATE INDEX idx_achievements_user ON achievements(user_id);
