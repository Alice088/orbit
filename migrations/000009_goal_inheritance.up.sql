ALTER TABLE goals ADD COLUMN parent_goal_id UUID REFERENCES goals(id);
CREATE INDEX idx_goals_parent ON goals(parent_goal_id);
