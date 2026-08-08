ALTER TABLE users ADD COLUMN name TEXT;
UPDATE users SET name = email WHERE name IS NULL;
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
CREATE UNIQUE INDEX users_name_unique ON users (name);
