CREATE TABLE habit_milestone_clears (
    user_id UUID NOT NULL REFERENCES users(id),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    milestone_idx INTEGER NOT NULL,
    level INTEGER NOT NULL,
    bonus_xp INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (habit_id, milestone_idx, level)
);

CREATE INDEX idx_habit_clears_user ON habit_milestone_clears(user_id);

INSERT INTO habit_milestone_clears (user_id, habit_id, milestone_idx, level, bonus_xp)
SELECT h.user_id, sm.habit_id, sm.milestone_idx, 1, sm.bonus_xp
FROM (
    SELECT habit_id, days, bonus_xp,
           ROW_NUMBER() OVER (PARTITION BY habit_id ORDER BY days) - 1 AS milestone_idx
    FROM habit_streak_milestones
) sm
JOIN habits h ON h.id = sm.habit_id
JOIN streaks st ON st.habit_id = sm.habit_id AND st.user_id = h.user_id
WHERE st.current_days >= sm.days
ON CONFLICT DO NOTHING;
