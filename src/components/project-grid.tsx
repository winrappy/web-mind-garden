"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Ellipsis, FileText, FolderOpen, FolderPlus, Globe, Leaf, Lock, LogOut, RotateCcw, Settings, Shield, Trash2, X } from "lucide-react";

const roleLabelMap: Record<string, string> = { VIEW: "View", EDIT: "Edit", ADMIN: "Admin", OWNER: "Owner", NONE: "No access" };

type Project = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  visibility: string;
  authorId: string;
  articleCount: number;
  memberPermissions: { userId: string; role: string }[];
  accessible: boolean;
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
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageMode, setImageMode] = useState<"url" | "upload">(initial?.imageUrl ? "url" : "upload");
  const [imageUploadError, setImageUploadError] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "RESTRICTED">(
    (initial?.visibility as "PUBLIC" | "RESTRICTED") ?? "PUBLIC"
  );
  const [memberPermissions, setMemberPermissions] = useState<{ userId: string; role: string }[]>(
    initial?.memberPermissions ?? []
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [permissionMenuFor, setPermissionMenuFor] = useState<string | null>(null);
  const [canScrollMembers, setCanScrollMembers] = useState(false);
  const [isMemberListAtBottom, setIsMemberListAtBottom] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const memberListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const t = e.target as HTMLElement | null;
      if (permissionMenuFor && t && !t.closest(".member-menu-wrap") && !t.closest(".member-menu-inline")) {
        setPermissionMenuFor(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [permissionMenuFor]);

  useEffect(() => {
    setImageLoadError(false);
  }, [imageUrl]);

  function roleByUserId(userId: string) {
    return memberPermissions.find((p) => p.userId === userId)?.role ?? "NONE";
  }

  function roleForDisplay(userId: string) {
    if (initial?.authorId === userId || (!initial && userId === currentUserId)) return "OWNER";
    return roleByUserId(userId);
  }

  function updateMemberPermission(userId: string, role: string) {
    setMemberPermissions((prev) => {
      const filtered = prev.filter((p) => p.userId !== userId);
      return role === "NONE" ? filtered : [...filtered, { userId, role }];
    });
    setPermissionMenuFor(null);
  }

  function resetChanges() {
    if (!initial) return;
    setName(initial.name);
    setDescription(initial.description ?? "");
    setImageUrl(initial.imageUrl ?? "");
    setImageMode(initial.imageUrl ? "url" : "upload");
    setVisibility((initial.visibility as "PUBLIC" | "RESTRICTED") ?? "PUBLIC");
    setMemberPermissions(initial.memberPermissions ?? []);
    setMemberSearch("");
    setPermissionMenuFor(null);
    setError("");
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Project name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = { name: name.trim(), description: description.trim() || null, imageUrl: imageUrl.trim() || null, visibility, memberPermissions };
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
        memberPermissions: (saved.permissions ?? []).map((p: { userId: string; role: string }) => ({ userId: p.userId, role: p.role })),
        accessible: true,
      });
    } finally {
      setSaving(false);
    }
  }

  function refreshMemberListIndicator() {
    const el = memberListRef.current;
    if (!el) {
      setCanScrollMembers(false);
      setIsMemberListAtBottom(true);
      return;
    }
    const canScroll = el.scrollHeight > el.clientHeight + 1;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    setCanScrollMembers(canScroll);
    setIsMemberListAtBottom(atBottom);
  }

  const memberUsers = useMemo(() => {
    const self = allUsers.find((u) => u.id === currentUserId);
    const others = allUsers.filter((u) => u.id !== currentUserId);
    return self ? [self, ...others] : allUsers;
  }, [allUsers, currentUserId]);

  const filteredMemberUsers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return memberUsers;
    return memberUsers.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q));
  }, [memberSearch, memberUsers]);

  const normalizedMemberPermissions = useMemo(
    () => [...memberPermissions].sort((a, b) => (a.userId + a.role).localeCompare(b.userId + b.role)),
    [memberPermissions]
  );
  const normalizedInitialMemberPermissions = useMemo(
    () => [...(initial?.memberPermissions ?? [])].sort((a, b) => (a.userId + a.role).localeCompare(b.userId + b.role)),
    [initial?.memberPermissions]
  );
  const hasChanges = useMemo(() => {
    if (!initial) return true;
    return (
      name.trim() !== initial.name ||
      (description.trim() || "") !== (initial.description ?? "") ||
      (imageUrl.trim() || "") !== (initial.imageUrl ?? "") ||
      visibility !== initial.visibility ||
      JSON.stringify(normalizedMemberPermissions) !== JSON.stringify(normalizedInitialMemberPermissions)
    );
  }, [description, imageUrl, initial, name, normalizedInitialMemberPermissions, normalizedMemberPermissions, visibility]);
  const hasImagePreview = Boolean(imageUrl) && !imageLoadError;

  useEffect(() => {
    refreshMemberListIndicator();
  }, [filteredMemberUsers.length, visibility]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-accent-head project-modal-head">
          <div className="modal-accent-icon project-modal-icon">
            <FolderPlus size={20} />
          </div>
          <div className="project-modal-head-text">
            <h2>{isEdit ? "Edit project" : "New project"}</h2>
            <p>{isEdit ? "Update your project details" : "Set up a new knowledge space"}</p>
          </div>
          <div className="project-modal-head-actions">
            {isEdit && hasChanges && (
              <div className="project-modal-inline-actions">
                <button
                  type="button"
                  className="btn project-modal-cancel-btn project-modal-action-btn"
                  onClick={resetChanges}
                  disabled={saving}
                  aria-label="Cancel changes"
                  title="Cancel changes"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  type="submit"
                  form="project-modal-form"
                  className="btn project-modal-save-icon-btn project-modal-action-btn"
                  disabled={saving}
                  aria-label="Save changes"
                  title="Save changes"
                >
                  <Check size={14} />
                </button>
              </div>
            )}
            {!isEdit && (
              <button
                type="submit"
                form="project-modal-form"
                className="btn primary project-modal-save-btn"
                disabled={saving}
                aria-label="Create project"
                title="Create project"
              >
                {saving ? "Saving…" : "Create project"}
              </button>
            )}
            <button className="btn icon modal-close-btn" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </div>
        </div>

        <form id="project-modal-form" className="modal-form" onSubmit={handleSubmit}>

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
                    {hasImagePreview ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="cover" onError={() => setImageLoadError(true)} />
                        <button
                          type="button"
                          className="image-thumb-remove"
                          onClick={(e) => { e.stopPropagation(); setImageUrl(""); setImageUploadError(""); setImageMode("upload"); }}
                          title="Remove image"
                          aria-label="Remove image"
                        ><X size={12} /></button>
                      </>
                    ) : (
                      <span className="image-compact-empty">No image</span>
                    )}
                    <input
                      id="modal-cover-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="image-upload-input"
                      onClick={(e) => e.stopPropagation()}
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
            {visibility === "RESTRICTED" && memberUsers.length > 0 && (
              <div className="settings-fields" style={{ borderTop: "1px solid rgba(200,215,238,0.6)", marginTop: 0, gap: 8 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <span>Member permissions</span>
                </div>
                <input
                  className="input"
                  placeholder="Search members…"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
                <div className="project-modal-member-meta">
                  <span>{filteredMemberUsers.length} member{filteredMemberUsers.length === 1 ? "" : "s"}</span>
                  {canScrollMembers && !isMemberListAtBottom ? <span>Scroll to see more</span> : null}
                </div>
                <div
                  ref={memberListRef}
                  className={`project-modal-member-list${canScrollMembers && !isMemberListAtBottom ? " can-scroll-more" : ""}`}
                  onScroll={refreshMemberListIndicator}
                >
                  {filteredMemberUsers.map((u) => {
                      const role = roleForDisplay(u.id);
                      const cannotEditRole = role === "OWNER" || u.id === currentUserId;
                      return (
                        <div key={u.id} className="permission-row member-row">
                          <div className="member-row-main">
                            <span className="member-row-avatar" aria-hidden>{(u.name.slice(0, 1) || "?").toUpperCase()}</span>
                            <div className="member-row-meta">
                              <strong>{u.name}{u.id === currentUserId ? " (You)" : ""}</strong>
                              <div className="muted">{u.email}</div>
                            </div>
                          </div>
                          <div className="member-row-actions">
                            <span className={`member-access-label role-${role.toLowerCase()}`}>{roleLabelMap[role] ?? role}</span>
                            <div className="member-menu-wrap">
                              <button
                                type="button"
                                className="btn icon member-menu-btn"
                                aria-label={`Change access for ${u.name}`}
                                aria-expanded={permissionMenuFor === u.id}
                                onClick={() => setPermissionMenuFor((prev) => (prev === u.id ? null : u.id))}
                                disabled={cannotEditRole}
                              >
                                <Ellipsis size={14} />
                              </button>
                              {permissionMenuFor === u.id && !cannotEditRole && (
                                <div className="member-menu-inline" role="menu">
                                  <div className="member-menu-segmented">
                                    {(["VIEW", "EDIT", "ADMIN", "NONE"] as const).map((r) => (
                                      <button
                                        key={r}
                                        type="button"
                                        className={`member-menu-item role-${r.toLowerCase()}${role === r ? " is-active" : ""}`}
                                        onClick={() => updateMemberPermission(u.id, r)}
                                      >
                                        {roleLabelMap[r]}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {filteredMemberUsers.length === 0 && memberSearch.trim() && (
                    <div className="member-search-empty">No members found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && <p className="login-error" style={{ margin: "0 24px 4px" }}>{error}</p>}

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
            {projects.map((project) => {
              const cardBody = (
                <>
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
                </>
              );
              return (
                <div key={project.id} className="project-card-wrap">
                  {project.accessible ? (
                    <a href={`/projects/${project.id}`} className="project-card">{cardBody}</a>
                  ) : (
                    <div className="project-card no-access" title="You do not have access to this project">{cardBody}</div>
                  )}
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
              );
            })}
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
