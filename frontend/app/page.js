"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_PATH || "/api";

// default “easy mode” tenant header
const TENANT_HEADERS = { "X-Tenant-Id": "1", "Content-Type": "application/json" };

export default function Page() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  async function loadProjects() {
    const r = await fetch(`${API}/projects`, { headers: TENANT_HEADERS });
    const data = await r.json();
    setProjects(data);
    if (data.length && !selectedProject) {
      setSelectedProject(data[0]);
    }
  }

  async function loadTasks(projectId) {
    if (!projectId) return;
    const r = await fetch(`${API}/tasks?project_id=${projectId}`, { headers: TENANT_HEADERS });
    const data = await r.json();
    setTasks(data);
  }

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadTasks(selectedProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id]);

  async function createProject(e) {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await fetch(`${API}/projects`, {
      method: "POST",
      headers: TENANT_HEADERS,
      body: JSON.stringify({ name: newProjectName.trim() })
    });
    setNewProjectName("");
    await loadProjects();
  }

  async function createTask(e) {
    e.preventDefault();
    if (!selectedProject || !newTaskTitle.trim()) return;
    await fetch(`${API}/tasks`, {
      method: "POST",
      headers: TENANT_HEADERS,
      body: JSON.stringify({ project_id: selectedProject.id, title: newTaskTitle.trim() })
    });
    setNewTaskTitle("");
    await loadTasks(selectedProject.id);
  }

  async function toggleTask(id) {
    await fetch(`${API}/tasks/${id}/toggle`, {
      method: "PATCH",
      headers: TENANT_HEADERS
    });
    await loadTasks(selectedProject.id);
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <h1>Project Management (SaaS Starter)</h1>

      <section style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2>Projects</h2>
        <form onSubmit={createProject} style={{ marginBottom: 12 }}>
          <input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="New project name"
            style={{ padding: 8, marginRight: 8 }}
          />
          <button type="submit">Create</button>
        </form>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #aaa",
                background: selectedProject?.id === p.id ? "#eef" : "#fff",
                cursor: "pointer"
              }}
              title={new Date(p.created_at).toLocaleString()}
            >
              {p.name}
            </button>
          ))}
          {!projects.length && <p>No projects yet.</p>}
        </div>
      </section>

      <section style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2>Tasks {selectedProject ? `for "${selectedProject.name}"` : ""}</h2>
        <form onSubmit={createTask} style={{ marginBottom: 12 }}>
          <input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Task title"
            style={{ padding: 8, marginRight: 8 }}
            disabled={!selectedProject}
          />
          <button type="submit" disabled={!selectedProject}>Add Task</button>
        </form>

        <ul style={{ listStyle: "none", padding: 0 }}>
          {tasks.map((t) => (
            <li key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
              <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
              <span style={{ textDecoration: t.done ? "line-through" : "none" }}>{t.title}</span>
              <small style={{ color: "#666" }}>({new Date(t.created_at).toLocaleString()})</small>
            </li>
          ))}
          {!tasks.length && <p>No tasks.</p>}
        </ul>
      </section>
    </main>
  );
}
