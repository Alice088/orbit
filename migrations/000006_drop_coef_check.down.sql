ALTER TABLE tasks ADD CONSTRAINT tasks_contribution_coef_check CHECK (contribution_coef BETWEEN 50 AND 100);
