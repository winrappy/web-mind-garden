"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Content } from "@tiptap/react";
import { ArrowLeft, Check, Ellipsis, FolderOpen, FolderPlus, Globe, Leaf, Lock, LogOut, Pencil, RotateCcw, Save, Settings, Shield, Trash2, X } from "lucide-react";

const RichEditor = dynamic(() => import("@/components/rich-editor").then((module) => module.RichEditor), { ssr: false });

type User = { id: string; name: string; email: string; avatarUrl?: string | null };
type ProjectTopic = { id: string; name: string; description: string | null; articleCount: number };
type MemberPermission = { userId: string; role: "VIEW" | "EDIT" | "ADMIN" };

export function ProjectOverview({
  projectId,
  name,
  imageUrl,
  visibility,
  description,
  detail,
  isOwner,
  canEditProject,
  canManageMembers,
  users,
  memberPermissions,
  topics: initialTopics,
  currentUser,
}: {
  projectId: string;
  name: string;
  imageUrl: string | null;
  visibility: "PUBLIC" | "RESTRICTED";
  description: string | null;
  detail: string | null;
  isOwner: boolean;
  canEditProject: boolean;
  canManageMembers: boolean;
  users: { id: string; name: string; email: string }[];
  memberPermissions: MemberPermission[];
  topics: ProjectTopic[];
  currentUser: User;
}) {
  const [topics, setTopics] = useState<ProjectTopic[]>(initialTopics);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [permissionMenuFor, setPermissionMenuFor] = useState<string | null>(null);
  const [topicModal, setTopicModal] = useState<{ mode: "create" } | { mode: "edit"; topic: ProjectTopic } | null>(null);
  const [topicModalName, setTopicModalName] = useState("");
  const [topicModalDesc, setTopicModalDesc] = useState("");
  const [topicModalSaving, setTopicModalSaving] = useState(false);
  const topicModalInputRef = useRef<HTMLInputElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const [projectName, setProjectName] = useState(name);
  const [projectImage, setProjectImage] = useState(imageUrl ?? "");
  const [imageMode, setImageMode] = useState<"url" | "upload">(imageUrl ? "url" : "upload");
  const [imageUploadError, setImageUploadError] = useState("");
  const [projectVisibility, setProjectVisibility] = useState<"PUBLIC" | "RESTRICTED">(visibility);

  // Track saved baseline to detect unsaved changes
  const [savedName, setSavedName] = useState(name);
  const [savedImage, setSavedImage] = useState(imageUrl ?? "");
  const [savedVisibility, setSavedVisibility] = useState<"PUBLIC" | "RESTRICTED">(visibility);
  const [savedPermissions, setSavedPermissions] = useState<Record<string, "NONE" | "VIEW" | "EDIT" | "ADMIN">>(() => {
    const map: Record<string, "NONE" | "VIEW" | "EDIT" | "ADMIN"> = {};
    for (const user of users) map[user.id] = "NONE";
    for (const permission of memberPermissions) map[permission.userId] = permission.role;
    return map;
  });

  const [savedDescription, setSavedDescription] = useState<string | null>(description);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionContent, setDescriptionContent] = useState<Content>(() => parseDescriptionContent(detail));
  const [savedDetail, setSavedDetail] = useState<string | null>(detail);
  const [projectDescription, setProjectDescription] = useState(description ?? "");

  const [permissions, setPermissions] = useState<Record<string, "NONE" | "VIEW" | "EDIT" | "ADMIN">>(() => {
    const map: Record<string, "NONE" | "VIEW" | "EDIT" | "ADMIN"> = {};
    for (const user of users) map[user.id] = "NONE";
    for (const permission of memberPermissions) map[permission.userId] = permission.role;
    return map;
  });

  const plainDescription = useMemo(() => extractPlainText(descriptionContent).trim(), [descriptionContent]);

  const isSettingsDirty = useMemo(() => {
    if (projectName.trim() !== savedName) return true;
    if (projectImage.trim() !== savedImage) return true;
    if (projectDescription.trim() !== (savedDescription ?? "")) return true;
    if (projectVisibility !== savedVisibility) return true;
    for (const userId of Object.keys(permissions)) {
      if ((permissions[userId] ?? "NONE") !== (savedPermissions[userId] ?? "NONE")) return true;
    }
    return false;
  }, [projectName, projectImage, projectDescription, projectVisibility, permissions, savedName, savedImage, savedDescription, savedVisibility, savedPermissions]);

  const managedMembers = useMemo(() => users.filter((item) => item.id !== currentUser.id), [users, currentUser.id]);

  const accessibleMemberCount = useMemo(
    () => managedMembers.filter((item) => (permissions[item.id] || "NONE") !== "NONE").length,
    [managedMembers, permissions],
  );

  const filteredMembers = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    if (!keyword) return managedMembers;
    return managedMembers.filter((item) => item.name.toLowerCase().includes(keyword) || item.email.toLowerCase().includes(keyword));
  }, [managedMembers, memberSearch]);

  const filteredAccessibleMembers = useMemo(
    () => filteredMembers.filter((item) => (permissions[item.id] || "NONE") !== "NONE"),
    [filteredMembers, permissions],
  );

  const filteredNoAccessMembers = useMemo(
    () => filteredMembers.filter((item) => (permissions[item.id] || "NONE") === "NONE"),
    [filteredMembers, permissions],
  );

  const roleLabelMap: Record<"NONE" | "VIEW" | "EDIT" | "ADMIN", string> = {
    NONE: "No access",
    VIEW: "View",
    EDIT: "Edit",
    ADMIN: "Admin",
  };

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (isAccountOpen && accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setIsAccountOpen(false);
      }

      if (permissionMenuFor && !target.closest(".member-menu-wrap") && !target.closest(".member-menu-inline")) {
        setPermissionMenuFor(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isAccountOpen, permissionMenuFor]);

  function buildMemberPermissionsPayload(permissionMap: Record<string, "NONE" | "VIEW" | "EDIT" | "ADMIN">) {
    return Object.entries(permissionMap)
      .filter(([, role]) => role !== "NONE")
      .map(([userId, role]) => ({ userId, role }));
  }

  async function saveAccessSettings(nextVisibility: "PUBLIC" | "RESTRICTED", nextPermissions: Record<string, "NONE" | "VIEW" | "EDIT" | "ADMIN">) {
    if (!canManageMembers) return false;
    setAccessSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        memberPermissions: buildMemberPermissionsPayload(nextPermissions),
      };
      if (isOwner) {
        payload.visibility = nextVisibility;
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || "Unable to save access settings");
        return false;
      }
      setSavedVisibility(nextVisibility);
      setSavedPermissions({ ...nextPermissions });
      return true;
    } finally {
      setAccessSaving(false);
    }
  }

  async function updateMemberPermission(userId: string, role: "NONE" | "VIEW" | "EDIT" | "ADMIN") {
    const previous = permissions;
    const next = {
      ...permissions,
      [userId]: role,
    };
    setPermissions(next);
    setPermissionMenuFor(null);
    const ok = await saveAccessSettings(projectVisibility, next);
    if (!ok) setPermissions(previous);
  }

  async function handleVisibilityChange(nextVisibility: "PUBLIC" | "RESTRICTED") {
    const previousVisibility = projectVisibility;
    setProjectVisibility(nextVisibility);
    setPermissionMenuFor(null);
    const ok = await saveAccessSettings(nextVisibility, permissions);
    if (!ok) setProjectVisibility(previousVisibility);
  }

  function renderMemberPermissionRow(item: { id: string; name: string; email: string }) {
    const role = permissions[item.id] || "NONE";
    return (
      <label key={item.id} className="permission-row member-row">
        <div className="member-row-main">
          <span className="member-row-avatar" aria-hidden>
            {(item.name.slice(0, 1) || "?").toUpperCase()}
          </span>
          <div className="member-row-meta">
            <strong>{item.name}</strong>
            <div className="muted">{item.email}</div>
          </div>
        </div>
        <div className="member-row-actions">
          <span className={`member-access-label role-${role.toLowerCase()}`}>{roleLabelMap[role]}</span>
          <div className="member-menu-wrap">
            <button
              type="button"
              className="btn icon member-menu-btn"
              aria-label={`Change access for ${item.name}`}
              aria-expanded={permissionMenuFor === item.id}
              onClick={() => setPermissionMenuFor((prev) => (prev === item.id ? null : item.id))}
              disabled={!canManageMembers || accessSaving}
            >
              <Ellipsis size={14} />
            </button>
            {permissionMenuFor === item.id ? (
              <div className="member-menu-inline" role="menu" aria-label={`Access options for ${item.name}`}>
                <div className="member-menu-segmented">
                  <button
                    type="button"
                    className={`member-menu-item role-view ${role === "VIEW" ? "is-active" : ""}`}
                    onClick={() => updateMemberPermission(item.id, "VIEW")}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className={`member-menu-item role-edit ${role === "EDIT" ? "is-active" : ""}`}
                    onClick={() => updateMemberPermission(item.id, "EDIT")}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`member-menu-item role-admin ${role === "ADMIN" ? "is-active" : ""}`}
                    onClick={() => updateMemberPermission(item.id, "ADMIN")}
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    className={`member-menu-item role-none ${role === "NONE" ? "is-active" : ""}`}
                    onClick={() => updateMemberPermission(item.id, "NONE")}
                  >
                    No access
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </label>
    );
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function saveDescription() {
    if (!canEditProject) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detail: plainDescription ? JSON.stringify(descriptionContent) : null }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || "Unable to save detail");
        return;
      }
      setSavedDetail(plainDescription ? JSON.stringify(descriptionContent) : null);
      setIsEditingDescription(false);
    } finally {
      setSaving(false);
    }
  }

  async function saveAllSettings() {
    if (!isOwner) return;
    setSaving(true);
    setError("");
    try {
      const memberPermissionsPayload = Object.entries(permissions)
        .filter(([, role]) => role !== "NONE")
        .map(([userId, role]) => ({ userId, role }));

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          imageUrl: projectImage.trim() || null,
          visibility: projectVisibility,
          memberPermissions: memberPermissionsPayload,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || "Unable to save settings");
        return;
      }
      setSavedName(projectName.trim());
      setSavedDescription(projectDescription.trim() || null);
      setSavedImage(projectImage.trim());
      setSavedVisibility(projectVisibility);
      setSavedPermissions({ ...permissions });
    } finally {
      setSaving(false);
    }
  }

  function resetAllSettings() {
    setProjectName(savedName);
    setProjectDescription(savedDescription ?? "");
    setProjectImage(savedImage);
    setImageMode(savedImage ? "url" : "upload");
    setImageUploadError("");
    setProjectVisibility(savedVisibility);
    setPermissions({ ...savedPermissions });
    setMemberSearch("");
    setPermissionMenuFor(null);
    setError("");
  }

  async function deleteProject() {
    if (!isOwner) return;
    const ok = window.confirm("Delete this project and all topics/articles? This cannot be undone.");
    if (!ok) return;
    const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Unable to delete project");
      return;
    }
    window.location.href = "/";
  }

  function openCreateTopicModal() {
    if (!canEditProject) return;
    setTopicModalName("");
    setTopicModalDesc("");
    setTopicModal({ mode: "create" });
    setTimeout(() => topicModalInputRef.current?.focus(), 50);
  }

  function openEditTopicModal(topic: ProjectTopic) {
    if (!canEditProject) return;
    setTopicModalName(topic.name);
    setTopicModalDesc(topic.description ?? "");
    setTopicModal({ mode: "edit", topic });
    setTimeout(() => topicModalInputRef.current?.focus(), 50);
  }

  async function submitTopicModal() {
    if (!topicModal || !topicModalName.trim()) return;
    setTopicModalSaving(true);
    try {
      if (topicModal.mode === "create") {
        const response = await fetch("/api/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, name: topicModalName.trim(), description: topicModalDesc.trim() || undefined }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          setError(body.error || "Unable to create topic");
          return;
        }
        const topic = (await response.json()) as ProjectTopic;
        setTopics((items) => [...items, topic]);
      } else {
        const { topic } = topicModal;
        const response = await fetch(`/api/topics/${topic.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: topicModalName.trim(), description: topicModalDesc.trim() || null }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          setError(body.error || "Unable to edit topic");
          return;
        }
        const updated = (await response.json()) as ProjectTopic;
        setTopics((items) => items.map((item) => (item.id === topic.id ? updated : item)));
      }
      setTopicModal(null);
    } finally {
      setTopicModalSaving(false);
    }
  }

  async function deleteTopic(topic: ProjectTopic) {
    if (!canEditProject) return;
    const ok = window.confirm(`Delete topic \"${topic.name}\" and its articles?`);
    if (!ok) return;

    const response = await fetch(`/api/topics/${topic.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Unable to delete topic");
      return;
    }

    setTopics((items) => items.filter((item) => item.id !== topic.id));
  }

  return (
    <main className="projects-shell">
      {/* ── Top navigation ── */}
      <header className="topbar">
        <div className="brand navbar-brand">
          <div className="brand-mark">
            <Leaf size={16} strokeWidth={1.9} />
          </div>
          <h1>Mind Garden</h1>
        </div>
        <div className="top-actions">
          <div className="account-menu" ref={accountMenuRef}>
            <button className="avatar account-trigger" aria-expanded={isAccountOpen} aria-label="Open account menu" onClick={() => setIsAccountOpen((value) => !value)}>
              {currentUser.avatarUrl && !avatarLoadFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="avatar-image" src={currentUser.avatarUrl} alt={currentUser.name} onError={() => setAvatarLoadFailed(true)} />
              ) : (
                currentUser.name.slice(0, 1).toUpperCase()
              )}
            </button>
            {isAccountOpen ? (
              <div className="account-popover">
                <div>
                  <strong>{currentUser.name}</strong>
                  <div className="muted">{currentUser.email}</div>
                </div>
                <button className="btn" onClick={logout}>
                  <LogOut size={16} /> Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* ── Project page body ── */}
      <div className="pd-page">

        {/* Cover banner */}
        {savedImage ? (
          <div className="pd-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={savedImage} alt={savedName} />
          </div>
        ) : null}

        <div className="pd-inner">

          {/* Project header */}
          <div className="pd-header">
            <div className="pd-header-left">
              <a href="/" className="btn icon" title="All projects" aria-label="Back to projects">
                <ArrowLeft size={18} />
              </a>
              <div className="pd-title-block">
                <div className="pd-title-row">
                  <h1 className="pd-title">{savedName}</h1>
                  <span className={`project-badge ${projectVisibility === "PUBLIC" ? "badge-public" : "badge-restricted"}`}>
                    {projectVisibility === "PUBLIC" ? "Public" : "Restricted"}
                  </span>
                </div>
                {savedDescription ? (
                  <p className="pd-project-description">{savedDescription}</p>
                ) : (
                  <p className="pd-subtitle muted">Project dashboard</p>
                )}
              </div>
            </div>
            <div className="pd-header-actions">
              <button className="btn" onClick={() => setIsToolsOpen((v) => !v)} aria-expanded={isToolsOpen}>
                <Ellipsis size={16} /> Settings
              </button>
            </div>
          </div>

          {/* Detail */}
          <div className="pd-description-section">
            <div className="pd-section-header">
              <div>
                <h2 className="pd-section-title">Detail</h2>
                <p className="pd-section-subtitle muted">Project notes and context</p>
              </div>
              {canEditProject && !isEditingDescription && (
                <button className="btn" onClick={() => setIsEditingDescription(true)}>
                  <Pencil size={14} /> Edit
                </button>
              )}
            </div>
            {isEditingDescription ? (
              <div className="pd-editor-wrap">
                <RichEditor editable={canEditProject} content={descriptionContent} onChange={setDescriptionContent} />
                <div className="page-head-actions">
                  <button
                    className="btn"
                    onClick={() => {
                      setDescriptionContent(parseDescriptionContent(savedDetail));
                      setIsEditingDescription(false);
                    }}
                  >
                    <X size={16} /> Cancel
                  </button>
                  <button className="btn primary" onClick={saveDescription} disabled={saving || !canEditProject}>
                    <Save size={16} /> Save
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`pd-description-view${canEditProject ? " is-editable" : ""}`}
                onClick={() => { if (canEditProject) setIsEditingDescription(true); }}
              >
                {plainDescription ? (
                  <span>{plainDescription}</span>
                ) : (
                  <span className="pd-description-empty">{canEditProject ? 'No detail yet — click Edit to add one.' : 'No detail.'}</span>
                )}
              </div>
            )}
          </div>

          {/* ── Topics ── */}
          <div className="pd-topics-section">
            <div className="pd-section-header">
              <div>
                <h2 className="pd-section-title">Topics</h2>
                <p className="pd-section-subtitle muted">{topics.length} topic{topics.length !== 1 ? "s" : ""} in this project</p>
              </div>
              {canEditProject ? (
                <button className="btn primary" onClick={openCreateTopicModal}>
                  <FolderPlus size={16} /> New topic
                </button>
              ) : null}
            </div>

            {topics.length > 0 ? (
              <div className="pd-topic-grid">
                {topics.map((topic) => (
                  <article key={topic.id} className="pd-topic-card">
                    <a href={`/projects/${projectId}/topics/${topic.id}/articles`} className="pd-topic-card-link">
                      <div className="pd-topic-card-icon">
                        <FolderOpen size={18} strokeWidth={1.8} />
                      </div>
                      <div className="pd-topic-card-body">
                        <h3 className="pd-topic-name">{topic.name}</h3>
                        {topic.description ? <p className="pd-topic-desc">{topic.description}</p> : null}
                        <span className="pd-topic-count">{topic.articleCount} article{topic.articleCount !== 1 ? "s" : ""}</span>
                      </div>
                    </a>
                    {canEditProject ? (
                      <div className="pd-topic-actions">
                        <button className="btn icon" onClick={() => openEditTopicModal(topic)} title="Rename topic" aria-label="Rename topic">
                          <Pencil size={14} />
                        </button>
                        <button className="btn icon danger" onClick={() => deleteTopic(topic)} title="Delete topic" aria-label="Delete topic">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="projects-empty">
                <FolderOpen size={44} strokeWidth={1.2} />
                <p>No topics yet. Create a topic to start organizing articles.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Settings drawer (same pattern as Topic Workspace) ── */}
      <button
        className={`drawer-backdrop ${isToolsOpen ? "open" : ""}`}
        aria-label="Close project settings"
        onClick={() => setIsToolsOpen(false)}
      />
      <aside className={`properties-drawer ${isToolsOpen ? "open" : ""}`} aria-hidden={!isToolsOpen}>
        <div className="drawer-header">
          <div>
            <h2>Project settings</h2>
          </div>
          <div className="pd-drawer-head-actions">
            {isOwner && isSettingsDirty ? (
              <div className="pd-drawer-inline-actions">
                <button
                  className="btn pd-drawer-cancel-btn pd-drawer-action-btn"
                  onClick={resetAllSettings}
                  disabled={saving}
                  aria-label="Undo changes"
                  title="Undo changes"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  className="btn pd-drawer-save-icon-btn pd-drawer-action-btn"
                  onClick={saveAllSettings}
                  disabled={saving}
                  aria-label="Save settings"
                  title="Save settings"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : null}
            <button className="btn icon" onClick={() => setIsToolsOpen(false)} aria-label="Close settings">
              <X size={16} />
            </button>
          </div>
        </div>

        <section className="panel section settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon icon-blue"><Settings size={15} /></div>
            <div className="settings-section-label">
              <strong>General</strong>
              <span>Name and cover image</span>
            </div>
          </div>
          <div className="settings-fields">
            <label className="field">
              <span>Project name</span>
              <input className="input" value={projectName} onChange={(event) => setProjectName(event.target.value)} disabled={!isOwner} />
            </label>
            <div className="field">
              <span className="field-label-with-count">Description <span className="char-count">{projectDescription.length}/100</span></span>
              <textarea
                className="input settings-desc-textarea"
                rows={2}
                maxLength={100}
                placeholder="Short project summary…"
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                disabled={!isOwner}
              />
            </div>
            <div className="field">
              <span>Cover image</span>
              <div className="image-compact-row">
                <div className="image-compact-thumb" onClick={() => { if (isOwner) (document.getElementById('cover-image-input') as HTMLInputElement)?.click(); }}>
                  {projectImage ? (
                    <>
                      <img src={projectImage} alt="cover" />
                      {isOwner && (
                        <button
                          type="button"
                          className="image-thumb-remove"
                          onClick={(e) => { e.stopPropagation(); setProjectImage(""); setImageUploadError(""); setImageMode("upload"); }}
                          title="Remove image"
                          aria-label="Remove image"
                        ><X size={12} /></button>
                      )}
                    </>
                  ) : (
                    <span className="image-compact-empty">🖼</span>
                  )}
                  <input
                    id="cover-image-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="image-upload-input"
                    disabled={!isOwner}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) { setImageUploadError("Image must be under 2 MB"); return; }
                      setImageUploadError("");
                      const reader = new FileReader();
                      reader.onload = () => { setProjectImage(reader.result as string); setImageMode("upload"); };
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
                <div className="image-compact-meta">
                  {imageMode === "url" ? (
                    <input
                      className="input image-compact-url"
                      placeholder="https://…"
                      value={projectImage}
                      onChange={(event) => setProjectImage(event.target.value)}
                      disabled={!isOwner}
                    />
                  ) : (
                    <span className="image-compact-name muted">
                      {projectImage ? "Image uploaded" : "No image set"}
                    </span>
                  )}
                  <div className="image-compact-actions">
                    <button type="button" className="image-action-btn" onClick={() => { if (isOwner) (document.getElementById('cover-image-input') as HTMLInputElement)?.click(); }} disabled={!isOwner}>Upload</button>
                    <span className="image-action-sep">or</span>
                    <button type="button" className={`image-action-btn${imageMode === "url" ? " is-active" : ""}`} onClick={() => setImageMode(imageMode === "url" ? "upload" : "url")} disabled={!isOwner}>Paste link</button>
                  </div>
                  {imageUploadError && <span className="image-upload-error">{imageUploadError}</span>}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel section settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon icon-teal"><Shield size={15} /></div>
            <div className="settings-section-label">
              <strong>Member access</strong>
              <span>Visibility and member permissions</span>
            </div>
          </div>
          <div className="settings-fields">
            <div className="visibility-cards">
              <button
                type="button"
                className={`visibility-card${projectVisibility === "PUBLIC" ? " is-active" : ""}`}
                onClick={() => { if (projectVisibility !== "PUBLIC") void handleVisibilityChange("PUBLIC"); }}
                disabled={!isOwner || accessSaving}
              >
                <Globe size={20} />
                <strong>Public</strong>
                <span>Anyone can view this project</span>
              </button>
              <button
                type="button"
                className={`visibility-card${projectVisibility === "RESTRICTED" ? " is-active" : ""}`}
                onClick={() => { if (projectVisibility !== "RESTRICTED") void handleVisibilityChange("RESTRICTED"); }}
                disabled={!isOwner || accessSaving}
              >
                <Lock size={20} />
                <strong>Restricted</strong>
                <span>Invited members only</span>
              </button>
            </div>
          </div>

          {projectVisibility === "RESTRICTED" ? (
            <div className="member-access-inline">
              <button
                className="btn member-access-trigger"
                onClick={() => {
                  setPermissionMenuFor(null);
                  setIsMembersModalOpen(true);
                }}
                disabled={!canManageMembers || accessSaving}
              >
                {accessibleMemberCount} member{accessibleMemberCount !== 1 ? "s" : ""} can access
              </button>
              <p className="member-access-hint muted">Choose who can view or edit this project.</p>
            </div>
          ) : (
            <p className="member-access-public muted">Public project does not require member selection.</p>
          )}
        </section>

        <section className="panel section settings-section settings-danger">
          <div className="settings-section-header">
            <div className="settings-section-icon icon-red"><Trash2 size={15} /></div>
            <div className="settings-section-label">
              <strong>Danger zone</strong>
              <span>Irreversible actions</span>
            </div>
          </div>
          <div className="settings-danger-content">
            <div className="settings-danger-text">
              <strong>Delete this project</strong>
              <span>Removes all topics and articles permanently.</span>
            </div>
            <button className="btn danger" onClick={deleteProject} disabled={!isOwner}>
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </section>

        {error ? <p className="login-error" style={{ padding: "0 2px" }}>{error}</p> : null}
      </aside>

      {topicModal ? (
        <div className="modal-backdrop" onClick={() => setTopicModal(null)}>
          <div
            className="modal-box topic-modal-box"
            role="dialog"
            aria-modal="true"
            aria-label={topicModal.mode === "create" ? "New topic" : "Rename topic"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-accent-head project-modal-head">
              <div className="modal-accent-icon project-modal-icon">
                <FolderPlus size={20} />
              </div>
              <div className="project-modal-head-text">
                <h2>{topicModal.mode === "create" ? "New topic" : "Rename topic"}</h2>
                <p>{topicModal.mode === "create" ? "Add a topic to organise articles" : "Update this topic's name"}</p>
              </div>
              <div className="project-modal-head-actions">
                <button
                  className="btn primary project-modal-save-btn"
                  onClick={() => void submitTopicModal()}
                  disabled={topicModalSaving || !topicModalName.trim()}
                >
                  {topicModalSaving ? "Saving…" : topicModal.mode === "create" ? "Create topic" : "Save"}
                </button>
                <button className="btn icon modal-close-btn" type="button" onClick={() => setTopicModal(null)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="modal-form">

              {/* ── General ── */}
              <div className="settings-section">
                <div className="settings-section-header">
                  <div className="settings-section-icon icon-blue"><Settings size={15} /></div>
                  <div className="settings-section-label">
                    <strong>General</strong>
                    <span>Name and description</span>
                  </div>
                </div>
                <div className="settings-fields">
                  <label className="field">
                    <span>Topic name *</span>
                    <input
                      ref={topicModalInputRef}
                      className="input"
                      placeholder="e.g. Introduction, Chapter 1…"
                      value={topicModalName}
                      onChange={(e) => setTopicModalName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") setTopicModal(null); }}
                      disabled={topicModalSaving}
                      maxLength={80}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Description</span>
                    <textarea
                      className="input modal-textarea"
                      placeholder="What is this topic about?"
                      value={topicModalDesc}
                      onChange={(e) => setTopicModalDesc(e.target.value)}
                      disabled={topicModalSaving}
                      rows={2}
                      maxLength={200}
                    />
                  </label>
                </div>
              </div>

              {/* ── Access ── */}
              <div className="settings-section">
                <div className="settings-section-header">
                  <div className="settings-section-icon icon-teal"><Shield size={15} /></div>
                  <div className="settings-section-label">
                    <strong>Access</strong>
                    <span>Inherited from project settings</span>
                  </div>
                </div>
                <div className="settings-fields">
                  <div className="visibility-cards topic-modal-visibility-cards">
                    <div className={`visibility-card${projectVisibility === "PUBLIC" ? " is-active" : ""} is-readonly`}>
                      <Globe size={20} />
                      <strong>Public</strong>
                      <span>Anyone can view</span>
                    </div>
                    <div className={`visibility-card${projectVisibility === "RESTRICTED" ? " is-active" : ""} is-readonly`}>
                      <Lock size={20} />
                      <strong>Restricted</strong>
                      <span>Invited members only</span>
                    </div>
                  </div>
                  {projectVisibility === "RESTRICTED" && (
                    <div className="topic-modal-member-list">
                      {[{ id: currentUser.id, name: currentUser.name, email: currentUser.email }, ...users.filter((u) => u.id !== currentUser.id && permissions[u.id] !== "NONE")].map((u) => (
                        <div key={u.id} className="permission-row member-row">
                          <div className="member-row-main">
                            <span className="member-row-avatar" aria-hidden>{(u.name.slice(0, 1) || "?").toUpperCase()}</span>
                            <div className="member-row-meta">
                              <strong>{u.name}{u.id === currentUser.id ? " (You)" : ""}</strong>
                              <div className="muted">{u.email}</div>
                            </div>
                          </div>
                          <span className={`member-access-label role-${u.id === currentUser.id && isOwner ? "owner" : (permissions[u.id] ?? "none").toLowerCase()}`}>
                            {u.id === currentUser.id && isOwner ? "Owner" : (permissions[u.id] ?? "None")}
                          </span>
                        </div>
                      ))}
                      <p className="topic-modal-access-note muted">To change access, update project settings.</p>
                    </div>
                  )}
                  {projectVisibility === "PUBLIC" && (
                    <p className="topic-modal-access-note muted">This is a public project — anyone can view topics and articles.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : null}

      {projectVisibility === "RESTRICTED" && isMembersModalOpen ? (
        <div className="member-modal-overlay">
          <div
            className="member-modal-backdrop"
            onClick={() => {
              setPermissionMenuFor(null);
              setIsMembersModalOpen(false);
            }}
            aria-hidden
          />
          <div className="member-modal" role="dialog" aria-modal="true" aria-label="Manage members">
            <div className="member-modal-head">
              <h4>Manage member access</h4>
              <button
                className="btn icon"
                onClick={() => {
                  setPermissionMenuFor(null);
                  setIsMembersModalOpen(false);
                }}
                aria-label="Close member access modal"
              >
                <X size={15} />
              </button>
            </div>
            <input
              className="input"
              placeholder="Search by name or email…"
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              disabled={!canManageMembers}
            />
            <div className="project-permission-list member-modal-list">
              {filteredMembers.length > 0 ? (
                <>
                  <div className="member-modal-group">
                    <div className="member-modal-group-title">Members with access ({filteredAccessibleMembers.length})</div>
                    {filteredAccessibleMembers.length > 0 ? filteredAccessibleMembers.map(renderMemberPermissionRow) : (
                      <p className="member-group-empty muted">No members currently have access.</p>
                    )}
                  </div>

                  <div className="member-modal-group member-modal-group-muted">
                    <div className="member-modal-group-title">Members without access ({filteredNoAccessMembers.length})</div>
                    {filteredNoAccessMembers.length > 0 ? filteredNoAccessMembers.map(renderMemberPermissionRow) : (
                      <p className="member-group-empty muted">All matched members already have access.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="member-search-empty muted">No members found.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function parseDescriptionContent(value: string | null): Content {
  if (!value || !value.trim()) return emptyDoc();
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && "type" in parsed) {
      return parsed as Content;
    }
  } catch {
    // Keep backward compatibility for old plain text descriptions.
  }
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
  };
}

function extractPlainText(value: Content): string {
  const walk = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    const entry = node as { type?: string; text?: string; content?: unknown[] };
    if (entry.type === "text") return entry.text || "";
    if (!Array.isArray(entry.content)) return "";
    return entry.content.map(walk).join(entry.type === "paragraph" ? "\n" : "");
  };
  return walk(value).replace(/\n{3,}/g, "\n\n");
}

function emptyDoc(): Content {
  return { type: "doc", content: [{ type: "paragraph" }] };
}
