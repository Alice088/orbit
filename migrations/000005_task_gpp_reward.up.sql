ALTER TABLE tasks ADD COLUMN gpp_reward INTEGER;
UPDATE tasks SET gpp_reward = 0;
ALTER TABLE tasks ALTER COLUMN gpp_reward SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN milestone_from_id DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN milestone_to_id DROP NOT NULL;
