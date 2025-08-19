import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;
const app = express();

app.use(express.json());
app.use(cors()); // safe due to Next proxy; fine to keep

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const TENANT_HEADER = "x-tenant-id";

// Simple health check
app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT 1");
    res.json({ ok: true, db: r.rowCount === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Middleware to resolve tenant (easy mode: header or default 1)
app.use((req, _res, next) => {
  const raw = req.header(TENANT_HEADER);
  req.tenantId = Number.isInteger(Number(raw)) ? Number(raw) : 1;
  next();
});

// List projects for tenant
app.get("/api/projects", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, created_at FROM projects WHERE tenant_id = $1 ORDER BY id DESC",
      [req.tenantId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create project
app.post("/api/projects", async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO projects (tenant_id, name) VALUES ($1, $2) RETURNING id, name, created_at",
      [req.tenantId, name]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List tasks for a project
app.get("/api/tasks", async (req, res) => {
  const projectId = Number(req.query.project_id);
  if (!Number.isInteger(projectId)) {
    return res.status(400).json({ error: "project_id is required (number)" });
  }
  try {
    // Ensure project belongs to tenant, then list tasks
    const proj = await pool.query(
      "SELECT id FROM projects WHERE id = $1 AND tenant_id = $2",
      [projectId, req.tenantId]
    );
    if (proj.rowCount === 0) return res.status(404).json({ error: "project not found" });

    const { rows } = await pool.query(
      "SELECT id, title, done, created_at FROM tasks WHERE project_id = $1 ORDER BY id DESC",
      [projectId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create task
app.post("/api/tasks", async (req, res) => {
  const { project_id, title } = req.body || {};
  const projectId = Number(project_id);
  if (!Number.isInteger(projectId) || !title) {
    return res.status(400).json({ error: "project_id (number) and title are required" });
  }
  try {
    const proj = await pool.query(
      "SELECT id FROM projects WHERE id = $1 AND tenant_id = $2",
      [projectId, req.tenantId]
    );
    if (proj.rowCount === 0) return res.status(404).json({ error: "project not found" });

    const { rows } = await pool.query(
      "INSERT INTO tasks (project_id, title, done) VALUES ($1, $2, FALSE) RETURNING id, title, done, created_at",
      [projectId, title]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Toggle task done
app.patch("/api/tasks/:id/toggle", async (req, res) => {
  const taskId = Number(req.params.id);
  if (!Number.isInteger(taskId)) return res.status(400).json({ error: "invalid id" });
  try {
    // Ensure task belongs to tenant via join
    const { rows: checked } = await pool.query(
      `SELECT t.id, t.done
         FROM tasks t
         JOIN projects p ON p.id = t.project_id
        WHERE t.id = $1 AND p.tenant_id = $2`,
      [taskId, req.tenantId]
    );
    if (checked.length === 0) return res.status(404).json({ error: "task not found" });

    const nextVal = !checked[0].done;
    const { rows } = await pool.query(
      "UPDATE tasks SET done = $1 WHERE id = $2 RETURNING id, title, done, created_at",
      [nextVal, taskId]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});
