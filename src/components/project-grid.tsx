"use client";

import { useState } from "react";
import { FolderOpen, FolderPlus, Leaf, LogOut, Settings, X } from "lucide-react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  visibility: string;
  authorId: string;
  articleCount: number;
  memberIds: string[];
};

type User = { id: string; name: string; email: string; avatarUrl?: string | null };

// ─── Create / Edit modal ─────────────────────────────────────────────────────

function ProjectModal({
  initial,
  allUsers,
  currentUserId,
  onClose,
  onSave,
}: {
  initial?: Project;
  allUsers: User[];
  currentUserId: string;
  onClose: () => void;
  onSave: (project: Project) => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [visibility, setVisibility] = useState<"PUBLIC" | "RESTRICTED">(
    (initial?.visibility as "PUBLIC" | "RESTRICTED") ?? "PUBLIC"
  );
  const [memberIds, setMemberIds] = useState<string[]>(initial?.memberIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleMember(userId: string) {
    setMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Project name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = { name: name.trim(), description: description.trim() || null, imageUrl: imageUrl.trim() || null, visibility, memberIds };
      const res = isEdit
        ? await fetch(`/api/projects/${initial!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const body = await res.json().catch(() => ({})); setError(body.error || "Something went wrong"); return; }
      const saved = await res.json();
      onSave({
        id: saved.id,
        name: saved.name,
        description: saved.description,
        imageUrl: saved.imageUrl,
        visibility: saved.visibility,
        authorId: saved.authorId,
        articleCount: initial?.articleCount ?? 0,
        memberIds: (saved.permissions ?? []).map((p: { userId: string }) => p.userId),
      });
    } finally {
      setSaving(false);
    }
  }

  const otherUsers = allUsers.filter((u) => u.id !== currentUserId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? "Edit project" : "New project"}</h2>
          <button className="btn icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="modal-field">
            <span>Project name *</span>
            <input className="login-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My awesome project" required />
          </label>

          <label className="modal-field">
            <span>Description</span>
            <textarea className="login-input modal-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about?" rows={3} />
          </label>

          <label className="modal-field">
            <span>Cover image URL</span>
            <input className="login-input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </label>

          {imageUrl && (
            <div className="modal-img-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="preview" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}

          <div className="modal-field">
            <span>Visibility</span>
            <div className="visibility-options">
              <label className={`visibility-option ${visibility === "PUBLIC" ? "selected" : ""}`}>
                <input type="radio" name="visibility" value="PUBLIC" checked={visibility === "PUBLIC"} onChange={() => setVisibility("PUBLIC")} />
                <div>
                  <strong>Public</strong>
                  <p>Anyone logged in can see this project</p>
                </div>
              </label>
              <label className={`visibility-option ${visibility === "RESTRICTED" ? "selected" : ""}`}>
                <input type="radio" name="visibility" value="RESTRICTED" checked={visibility === "RESTRICTED"} onChange={() => setVisibility("RESTRICTED")} />
                <div>
                  <strong>Restricted</strong>
                  <p>Only invited members can see this project</p>
                </div>
              </label>
            </div>
          </div>

          {visibility === "RESTRICTED" && otherUsers.length > 0 && (
            <div className="modal-field">
              <span>Invite members (optional)</span>
              <div className="member-list">
                {otherUsers.map((u) => (
                  <label key={u.id} className={`member-row ${memberIds.includes(u.id) ? "selected" : ""}`}>
                    <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} />
                    <div className="member-avatar">{u.name.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <div className="member-name">{u.name}</div>
                      <div className="member-email">{u.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="login-error" style={{ marginTop: 0 }}>{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn login-submit-btn modal-save-btn" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProjectGrid({
  currentUser,
  projects: initialProjects,
  allUsers,
}: {
  currentUser: User;
  projects: Project[];
  allUsers: User[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  function handleSaved(project: Project) {
    setProjects((prev) => {
      const exists = prev.find((p) => p.id === project.id);
      return exists ? prev.map((p) => (p.id === project.id ? project : p)) : [project, ...prev];
    });
    setShowCreate(false);
    setEditingProject(null);
  }

  return (
    <main className="projects-shell">
      <header className="topbar">
        <div className="brand navbar-brand">
          <div className="brand-mark">
            <Leaf size={16} strokeWidth={1.9} />
          </div>
          <h1>Mind Garden</h1>
        </div>
        <div className="top-actions">
          <div className="account-menu">
            <button className="avatar account-trigger" aria-expanded={isAccountOpen} aria-label="Open account menu" onClick={() => setIsAccountOpen((v) => !v)}>
              {currentUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="avatar-image" src={currentUser.avatarUrl} alt={currentUser.name} />
              ) : (
                currentUser.name.slice(0, 1).toUpperCase()
              )}
            </button>
            {isAccountOpen && (
              <div className="account-popover">
                <div>
                  <strong>{currentUser.name}</strong>
                  <div className="muted">{currentUser.email}</div>
                </div>
                <button className="btn" onClick={logout}><LogOut size={16} /> Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="projects-content">
        <div className="projects-head">
          <h2 className="projects-title">All Projects</h2>
          <button className="btn primary" onClick={() => setShowCreate(true)}>
            <FolderPlus size={16} /> New project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="projects-empty">
            <FolderOpen size={48} strokeWidth={1.2} />
            <p>No projects yet.</p>
            <button className="btn primary" onClick={() => setShowCreate(true)}>
              <FolderPlus size={16} /> Create your first project
            </button>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project) => (
              <div key={project.id} className="project-card-wrap">
                <a href={`/projects/${project.id}`} className="project-card">
                  <div className="project-card-image">
                    {project.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.imageUrl} alt={project.name} />
                    ) : (
                      <div className="project-card-placeholder">
                        <FolderOpen size={40} strokeWidth={1.2} />
                      </div>
                    )}
                  </div>
                  <div className="project-card-body">
                    <span className="project-card-name">{project.name}</span>
                    {project.description && (
                      <span className="project-card-desc">{project.description}</span>
                    )}
                    <div className="project-card-footer">
                      <span className="project-card-meta">{project.articleCount} article{project.articleCount !== 1 ? "s" : ""}</span>
                      <span className={`project-badge ${project.visibility === "PUBLIC" ? "badge-public" : "badge-restricted"}`}>
                        {project.visibility === "PUBLIC" ? "Public" : "Restricted"}
                      </span>
                    </div>
                  </div>
                </a>
                {project.authorId === currentUser.id && (
                  <button
                    className="project-settings-btn"
                    title="Edit project"
                    onClick={() => setEditingProject(project)}
                  >
                    <Settings size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <ProjectModal
          allUsers={allUsers}
          currentUserId={currentUser.id}
          onClose={() => setShowCreate(false)}
          onSave={handleSaved}
        />
      )}

      {editingProject && (
        <ProjectModal
          initial={editingProject}
          allUsers={allUsers}
          currentUserId={currentUser.id}
          onClose={() => setEditingProject(null)}
          onSave={handleSaved}
        />
      )}
    </main>
  );
}
