ALTER TABLE point_transactions ADD COLUMN source_goal_id UUID REFERENCES goals(id);
CREATE INDEX idx_tx_source_goal ON point_transactions(source_goal_id);
