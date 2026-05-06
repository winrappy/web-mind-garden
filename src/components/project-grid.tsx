"use client";

import { useState } from "react";
import { FileText, FolderOpen, FolderPlus, Globe, Leaf, Lock, LogOut, Settings, Shield, Trash2, X } from "lucide-react";

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
  const [imageMode, setImageMode] = useState<"url" | "upload">(initial?.imageUrl ? "url" : "upload");
  const [imageUploadError, setImageUploadError] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "RESTRICTED">(
    (initial?.visibility as "PUBLIC" | "RESTRICTED") ?? "PUBLIC"
  );
  const [memberIds, setMemberIds] = useState<string[]>(initial?.memberIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    if (!initial) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${initial.id}`, { method: "DELETE" });
      onSave({ ...initial, name: "__deleted__" });
    } finally {
      setSaving(false);
    }
  }

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
        <div className="modal-accent-head">
          <div className="modal-accent-icon"><FolderPlus size={22} /></div>
          <div>
            <h2>{isEdit ? "Edit project" : "New project"}</h2>
            <p>{isEdit ? "Update your project details" : "Set up a new knowledge space"}</p>
          </div>
          <button className="btn icon modal-close-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>

          {/* ── Section 1: General ── */}
          <div className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon icon-blue"><Settings size={15} /></div>
              <div className="settings-section-label">
                <strong>General</strong>
                <span>Name and cover image</span>
              </div>
            </div>
            <div className="settings-fields">
              <label className="field">
                <span>Project name *</span>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My awesome project" required />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea className="input modal-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about?" rows={3} />
              </label>
              <div className="field">
                <span>Cover image</span>
                <div className="image-compact-row">
                  <div className="image-compact-thumb" onClick={() => (document.getElementById('modal-cover-input') as HTMLInputElement)?.click()}>
                    {imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="cover" />
                        <button
                          type="button"
                          className="image-thumb-remove"
                          onClick={(e) => { e.stopPropagation(); setImageUrl(""); setImageUploadError(""); setImageMode("upload"); }}
                          title="Remove image"
                          aria-label="Remove image"
                        ><X size={12} /></button>
                      </>
                    ) : (
                      <span className="image-compact-empty">🖼</span>
                    )}
                    <input
                      id="modal-cover-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="image-upload-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) { setImageUploadError("Image must be under 2 MB"); return; }
                        setImageUploadError("");
                        const reader = new FileReader();
                        reader.onload = () => { setImageUrl(reader.result as string); setImageMode("upload"); };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </div>
                  <div className="image-compact-meta">
                    {imageMode === "url" ? (
                      <input
                        className="input image-compact-url"
                        placeholder="https://…"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                    ) : (
                      <span className="image-compact-name muted">
                        {imageUrl ? "Image uploaded" : "No image set"}
                      </span>
                    )}
                    <div className="image-compact-actions">
                      <button type="button" className="image-action-btn" onClick={() => (document.getElementById('modal-cover-input') as HTMLInputElement)?.click()}>Upload</button>
                      <span className="image-action-sep">or</span>
                      <button type="button" className={`image-action-btn${imageMode === "url" ? " is-active" : ""}`} onClick={() => setImageMode(imageMode === "url" ? "upload" : "url")}>Paste link</button>
                    </div>
                    {imageUploadError && <span className="image-upload-error">{imageUploadError}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Visibility ── */}
          <div className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon icon-teal"><Shield size={15} /></div>
              <div className="settings-section-label">
                <strong>Member access</strong>
                <span>Visibility and member permissions</span>
              </div>
            </div>
            <div className="settings-fields">
              <div className="visibility-cards">
                <button type="button" className={`visibility-card${visibility === "PUBLIC" ? " is-active" : ""}`} onClick={() => setVisibility("PUBLIC")}>
                  <Globe size={20} />
                  <strong>Public</strong>
                  <span>Anyone logged in can view</span>
                </button>
                <button type="button" className={`visibility-card${visibility === "RESTRICTED" ? " is-active" : ""}`} onClick={() => setVisibility("RESTRICTED")}>
                  <Lock size={20} />
                  <strong>Restricted</strong>
                  <span>Invited members only</span>
                </button>
              </div>
            </div>
            {visibility === "RESTRICTED" && otherUsers.length > 0 && (
              <div className="settings-fields" style={{ borderTop: "1px solid rgba(200,215,238,0.6)", marginTop: 0 }}>
                <div className="field">
                  <span>Invite members</span>
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
              </div>
            )}
          </div>

          {error && <p className="login-error" style={{ margin: "0 24px" }}>{error}</p>}

          {/* ── Section 3: Danger zone ── */}
          {isEdit && (
            <div className="settings-section settings-danger">
              <div className="settings-section-header">
                <div className="settings-section-icon icon-red"><Trash2 size={15} /></div>
                <div className="settings-section-label">
                  <strong>Danger zone</strong>
                  <span>Irreversible actions</span>
                </div>
              </div>
              <div className="settings-danger-content" style={{ padding: "0 20px 20px" }}>
                <div className="settings-danger-text">
                  <strong>Delete this project</strong>
                  <span>This will permanently remove all topics and articles.</span>
                </div>
                {confirmDelete ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn" onClick={() => setConfirmDelete(false)} disabled={saving}>Cancel</button>
                    <button type="button" className="btn danger" onClick={handleDelete} disabled={saving}>{saving ? "Deleting…" : "Confirm delete"}</button>
                  </div>
                ) : (
                  <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>Delete project</button>
                )}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn new-project-btn modal-save-btn" disabled={saving}>
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
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  function handleSaved(project: Project) {
    if (project.name === "__deleted__") {
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } else {
      setProjects((prev) => {
        const exists = prev.find((p) => p.id === project.id);
        return exists ? prev.map((p) => (p.id === project.id ? project : p)) : [project, ...prev];
      });
    }
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
              {currentUser.avatarUrl && !avatarLoadFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="avatar-image" src={currentUser.avatarUrl} alt={currentUser.name} onError={() => setAvatarLoadFailed(true)} />
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
          <button className="btn new-project-btn" onClick={() => setShowCreate(true)}>
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
