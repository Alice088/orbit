DROP INDEX IF EXISTS idx_tx_source_goal;
ALTER TABLE point_transactions DROP COLUMN IF EXISTS source_goal_id;
