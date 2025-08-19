-- Tenants (workspaces)
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

-- Users (for now, just structure; auth intentionally skipped in this “easy mode”)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- Projects belong to a tenant
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks belong to a project
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed one tenant + one user + one project + a couple tasks
INSERT INTO tenants (name) VALUES ('Acme, Inc.') ON CONFLICT DO NOTHING;

INSERT INTO users (email, password_hash, tenant_id)
SELECT 'admin@acme.test', NULL, t.id
FROM tenants t
WHERE t.name = 'Acme, Inc.'
ON CONFLICT DO NOTHING;

INSERT INTO projects (tenant_id, name)
SELECT t.id, 'Initial Project'
FROM tenants t
WHERE t.name = 'Acme, Inc.';

INSERT INTO tasks (project_id, title, done)
SELECT p.id, 'Set up repo', TRUE FROM projects p WHERE p.name='Initial Project';
INSERT INTO tasks (project_id, title, done)
SELECT p.id, 'Ship MVP', FALSE FROM projects p WHERE p.name='Initial Project';
