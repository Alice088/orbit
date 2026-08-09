DROP INDEX IF EXISTS idx_goals_parent;
ALTER TABLE goals DROP COLUMN IF EXISTS parent_goal_id;
