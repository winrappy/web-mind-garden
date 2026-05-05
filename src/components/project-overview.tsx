"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Content } from "@tiptap/react";
import { ArrowLeft, Ellipsis, FolderOpen, FolderPlus, Leaf, LogOut, Pencil, Save, Trash2, X } from "lucide-react";

const RichEditor = dynamic(() => import("@/components/rich-editor").then((module) => module.RichEditor), { ssr: false });

type User = { id: string; name: string; email: string; avatarUrl?: string | null };
type ProjectTopic = { id: string; name: string; description: string | null; articleCount: number };
type MemberPermission = { userId: string; role: "VIEW" | "EDIT" };

export function ProjectOverview({
  projectId,
  name,
  imageUrl,
  visibility,
  description,
  isOwner,
  canEditProject,
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
  isOwner: boolean;
  canEditProject: boolean;
  users: { id: string; name: string; email: string }[];
  memberPermissions: MemberPermission[];
  topics: ProjectTopic[];
  currentUser: User;
}) {
  const [topics, setTopics] = useState<ProjectTopic[]>(initialTopics);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [projectName, setProjectName] = useState(name);
  const [projectImage, setProjectImage] = useState(imageUrl ?? "");
  const [projectVisibility, setProjectVisibility] = useState<"PUBLIC" | "RESTRICTED">(visibility);

  const [savedDescription, setSavedDescription] = useState<string | null>(description);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionContent, setDescriptionContent] = useState<Content>(() => parseDescriptionContent(description));

  const [permissions, setPermissions] = useState<Record<string, "NONE" | "VIEW" | "EDIT">>(() => {
    const map: Record<string, "NONE" | "VIEW" | "EDIT"> = {};
    for (const user of users) map[user.id] = "NONE";
    for (const permission of memberPermissions) map[permission.userId] = permission.role;
    return map;
  });

  const plainDescription = useMemo(() => extractPlainText(descriptionContent).trim(), [descriptionContent]);

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
        body: JSON.stringify({ description: plainDescription ? JSON.stringify(descriptionContent) : null }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || "Unable to save description");
        return;
      }
      setSavedDescription(plainDescription ? JSON.stringify(descriptionContent) : null);
      setIsEditingDescription(false);
    } finally {
      setSaving(false);
    }
  }

  async function saveProjectSettings() {
    if (!isOwner) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          imageUrl: projectImage.trim() || null,
          visibility: projectVisibility,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || "Unable to save project settings");
      }
    } finally {
      setSaving(false);
    }
  }

  async function savePermissions() {
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
        body: JSON.stringify({ memberPermissions: memberPermissionsPayload }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || "Unable to save permissions");
      }
    } finally {
      setSaving(false);
    }
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

  async function createTopic() {
    if (!canEditProject) return;
    const topicName = window.prompt("Topic name");
    if (!topicName || !topicName.trim()) return;

    const response = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name: topicName.trim() }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Unable to create topic");
      return;
    }

    const topic = (await response.json()) as ProjectTopic;
    setTopics((items) => [...items, topic]);
  }

  async function editTopic(topic: ProjectTopic) {
    if (!canEditProject) return;
    const nextName = window.prompt("Edit topic name", topic.name);
    if (!nextName || !nextName.trim()) return;

    const response = await fetch(`/api/topics/${topic.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName.trim() }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Unable to edit topic");
      return;
    }

    const updated = (await response.json()) as ProjectTopic;
    setTopics((items) => items.map((item) => (item.id === topic.id ? updated : item)));
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
          <div className="account-menu">
            <button className="avatar account-trigger" aria-expanded={isAccountOpen} aria-label="Open account menu" onClick={() => setIsAccountOpen((value) => !value)}>
              {currentUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="avatar-image" src={currentUser.avatarUrl} alt={currentUser.name} />
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
        {projectImage ? (
          <div className="pd-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={projectImage} alt={projectName} />
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
                  <h1 className="pd-title">{projectName}</h1>
                  <span className={`project-badge ${projectVisibility === "PUBLIC" ? "badge-public" : "badge-restricted"}`}>
                    {projectVisibility === "PUBLIC" ? "Public" : "Restricted"}
                  </span>
                </div>
                <p className="pd-subtitle muted">Project dashboard</p>
              </div>
            </div>
            <div className="pd-header-actions">
              {!isEditingDescription && canEditProject ? (
                <button className="btn" onClick={() => setIsEditingDescription(true)}>
                  <Pencil size={16} /> Edit description
                </button>
              ) : null}
              <button className="btn" onClick={() => setIsToolsOpen((v) => !v)} aria-expanded={isToolsOpen}>
                <Ellipsis size={16} /> Settings
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="pd-description-section">
            {isEditingDescription ? (
              <div className="pd-editor-wrap">
                <RichEditor editable={canEditProject} content={descriptionContent} onChange={setDescriptionContent} />
                <div className="page-head-actions">
                  <button
                    className="btn"
                    onClick={() => {
                      setDescriptionContent(parseDescriptionContent(savedDescription));
                      setIsEditingDescription(false);
                    }}
                  >
                    <X size={16} /> Cancel
                  </button>
                  <button className="btn primary" onClick={saveDescription} disabled={saving || !canEditProject}>
                    <Save size={16} /> Save description
                  </button>
                </div>
              </div>
            ) : (
              <div className="pd-description-view">
                {plainDescription ? (
                  <span>{plainDescription}</span>
                ) : (
                  <span className="pd-description-empty">No description yet.{canEditProject ? ' Click "Edit description" to add one.' : ""}</span>
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
                <button className="btn primary" onClick={createTopic}>
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
                        <button className="btn icon" onClick={() => editTopic(topic)} title="Rename topic" aria-label="Rename topic">
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

      {/* ── Settings drawer ── */}
      {isToolsOpen ? (
        <div className="pd-drawer-overlay">
          <div className="pd-drawer-backdrop" onClick={() => setIsToolsOpen(false)} aria-hidden />
          <aside className="pd-drawer">
            <div className="pd-drawer-head">
              <h3>Project settings</h3>
              <button className="btn icon" onClick={() => setIsToolsOpen(false)} aria-label="Close settings">
                <X size={16} />
              </button>
            </div>

            <div className="pd-drawer-body">
              <div className="project-tools-group">
                <label className="field">
                  <span>Name</span>
                  <input className="input" value={projectName} onChange={(event) => setProjectName(event.target.value)} disabled={!isOwner} />
                </label>
                <label className="field">
                  <span>Cover image URL</span>
                  <input className="input" value={projectImage} onChange={(event) => setProjectImage(event.target.value)} disabled={!isOwner} />
                </label>
                <label className="field">
                  <span>Visibility</span>
                  <select className="select" value={projectVisibility} onChange={(event) => setProjectVisibility(event.target.value as "PUBLIC" | "RESTRICTED")} disabled={!isOwner}>
                    <option value="PUBLIC">Public</option>
                    <option value="RESTRICTED">Restricted</option>
                  </select>
                </label>
                <button className="btn primary" onClick={saveProjectSettings} disabled={!isOwner || saving}>
                  <Save size={16} /> Save details
                </button>
              </div>

              <div className="project-tools-group">
                <h4>Permissions</h4>
                <p className="muted">Set which users can view or edit this project.</p>
                <div className="project-permission-list">
                  {users
                    .filter((item) => item.id !== currentUser.id)
                    .map((item) => (
                      <label key={item.id} className="permission-row">
                        <div>
                          <strong>{item.name}</strong>
                          <div className="muted">{item.email}</div>
                        </div>
                        <select
                          className="select"
                          value={permissions[item.id] || "NONE"}
                          onChange={(event) =>
                            setPermissions((prev) => ({
                              ...prev,
                              [item.id]: event.target.value as "NONE" | "VIEW" | "EDIT",
                            }))
                          }
                          disabled={!isOwner}
                        >
                          <option value="NONE">No access</option>
                          <option value="VIEW">View</option>
                          <option value="EDIT">Edit</option>
                        </select>
                      </label>
                    ))}
                </div>
                <button className="btn primary" onClick={savePermissions} disabled={!isOwner || saving}>
                  <Save size={16} /> Save permissions
                </button>
              </div>

              <div className="project-tools-group danger-zone">
                <h4>Danger zone</h4>
                <button className="btn danger" onClick={deleteProject} disabled={!isOwner}>
                  <Trash2 size={16} /> Delete project
                </button>
              </div>

              {error ? <p className="login-error">{error}</p> : null}
            </div>
          </aside>
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
