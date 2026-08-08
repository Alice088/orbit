ALTER TABLE tasks ALTER COLUMN milestone_from_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN milestone_to_id SET NOT NULL;
ALTER TABLE tasks DROP COLUMN gpp_reward;
