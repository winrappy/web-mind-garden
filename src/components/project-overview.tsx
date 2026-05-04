"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Content } from "@tiptap/react";
import { ArrowLeft, Edit3, FolderPlus, Leaf, LogOut, Save, X } from "lucide-react";

const RichEditor = dynamic(() => import("@/components/rich-editor").then((module) => module.RichEditor), { ssr: false });

type User = { id: string; name: string; email: string; avatarUrl?: string | null };
type ProjectTopic = { id: string; name: string; description: string | null; articleCount: number };

export function ProjectOverview({
  projectId,
  name,
  imageUrl,
  visibility,
  description,
  canEdit,
  topics: initialTopics,
  currentUser,
}: {
  projectId: string;
  name: string;
  imageUrl: string | null;
  visibility: "PUBLIC" | "RESTRICTED";
  description: string | null;
  canEdit: boolean;
  topics: ProjectTopic[];
  currentUser: User;
}) {
  const [savedDescription, setSavedDescription] = useState<string | null>(description);
  const [topics, setTopics] = useState<ProjectTopic[]>(initialTopics);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState<Content>(() => parseDescriptionContent(savedDescription));

  const plainDescription = useMemo(() => extractPlainText(content).trim(), [content]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function createTopic() {
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

  async function saveDescription() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: plainDescription ? JSON.stringify(content) : null,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || "Unable to save project description");
        return;
      }

      setSavedDescription(plainDescription ? JSON.stringify(content) : null);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell project-overview-shell">
      <header className="topbar">
        <div className="brand navbar-brand">
          <div className="brand-mark">
            <Leaf size={16} strokeWidth={1.9} />
          </div>
          <h1>Mind Garden</h1>
        </div>
        <div className="top-actions">
          <div className="account-menu">
            <button
              className="avatar account-trigger"
              aria-expanded={isAccountOpen}
              aria-label="Open account menu"
              onClick={() => setIsAccountOpen((value) => !value)}
            >
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

      <aside className="sidebar">
        <section className="section sidebar-section">
          <div className="sidebar-head">
            <h3>Topics</h3>
            {canEdit ? (
              <button className="btn icon" onClick={createTopic} title="Create topic" aria-label="Create topic">
                <FolderPlus size={16} />
              </button>
            ) : null}
          </div>
          {topics.length ? (
            <div className="tree">
              {topics.map((topic) => (
                <a key={topic.id} className="tree-item article-link" href={`/projects/${projectId}/topics/${topic.id}/articles`}>
                  <span>
                    <span className="tree-title">{topic.name}</span>
                    <span className="tree-meta">{topic.description || "Open this topic to manage articles"}</span>
                  </span>
                  <span className="badge">{topic.articleCount} article{topic.articleCount !== 1 ? "s" : ""}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="muted">No topics yet. Create a topic before opening article pages.</p>
          )}
        </section>
      </aside>

      <section className="workspace project-overview-wrap">
        <div className="project-overview-page-head">
          <div className="page-head-main">
            <a href="/" className="btn icon back-btn" title="All projects" aria-label="Back to projects">
              <ArrowLeft size={18} />
            </a>
            <div>
              <h1>{name}</h1>
              <p>Project overview</p>
            </div>
          </div>
          <div className="page-head-actions">
            {canEdit && !isEditing && (
              <button className="btn primary" onClick={() => setIsEditing(true)}>
                <Edit3 size={16} /> Edit description
              </button>
            )}
            {canEdit && isEditing && (
              <>
                <button className="btn" onClick={() => { setContent(parseDescriptionContent(savedDescription)); setIsEditing(false); setError(""); }}>
                  <X size={16} /> Cancel
                </button>
                <button className="btn primary" onClick={saveDescription} disabled={saving}>
                  <Save size={16} /> {saving ? "Saving..." : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        <article className="project-overview-card">
          {imageUrl ? (
            <div className="project-overview-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={name} />
            </div>
          ) : null}

          <div className="project-overview-content">
            <div className="project-overview-head">
              <h2>{name}</h2>
              <span className={`project-badge ${visibility === "PUBLIC" ? "badge-public" : "badge-restricted"}`}>
                {visibility === "PUBLIC" ? "Public" : "Restricted"}
              </span>
            </div>

            {isEditing ? (
              <div className="project-overview-editor">
                <RichEditor editable={canEdit} content={content} onChange={setContent} />
              </div>
            ) : (
              <div className="project-overview-description">
                {plainDescription || "This project does not have a description yet."}
              </div>
            )}

            {error ? <p className="login-error">{error}</p> : null}
          </div>
        </article>
      </section>
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
