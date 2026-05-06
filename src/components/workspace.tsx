"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Content } from "@tiptap/react";
import { ArrowLeft, BookOpen, FilePlus2, Leaf, LogOut, PanelRightOpen, Save, Trash2, X } from "lucide-react";

const RichEditor = dynamic(() => import("@/components/rich-editor").then((module) => module.RichEditor), { ssr: false });

type Role = "NONE" | "VIEW" | "EDIT";
type Visibility = "CUSTOM" | "PUBLIC";

type Article = {
  id: string;
  title: string;
  parentId: string | null;
  projectId: string | null;
  topicId: string | null;
  layout: string;
  visibility: Visibility;
  content: Content;
  role: Role;
  permissions: { userId: string; role: Role }[];
  updatedAt: string;
};

type User = { id: string; name: string; email: string; avatarUrl?: string | null };

export function Workspace({
  projectId,
  topicId,
  projectName,
  backHref = "/",
  currentUser,
  users,
  articles: initialArticles,
}: {
  projectId: string;
  topicId: string;
  projectName: string;
  backHref?: string;
  currentUser: User;
  users: User[];
  articles: Article[];
}) {
  const [articles, setArticles] = useState(initialArticles);
  const [selectedId, setSelectedId] = useState(initialArticles[0]?.id);
  const [query, setQuery] = useState("");
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const selected = articles.find((article) => article.id === selectedId) || articles[0];
  const selectedPermissions = getArticlePermissions(selected);
  const editable = selected?.role === "EDIT";
  const width = selected?.layout === "compact" ? 860 : selected?.layout === "wide" ? 1360 : 1120;
  const descendantIds = useMemo(() => new Set(selected ? getDescendantIds(articles, selected.id) : []), [articles, selected]);

  async function refresh() {
    window.location.reload();
  }

  async function saveArticle(patch: Partial<Article>) {
    if (!selected) return;
    const response = await fetch(`/api/articles/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (response.ok) {
      setArticles((items) => items.map((item) => (item.id === selected.id ? { ...item, ...patch } : item)));
    }
  }

  async function createArticle() {
    const response = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: editable ? selected?.id : null, projectId, topicId }),
    });
    const article = await response.json();
    setArticles((items) => [article, ...items]);
    setSelectedId(article.id);
  }

  async function deleteArticle() {
    if (!selected || !editable) return;
    await fetch(`/api/articles/${selected.id}`, { method: "DELETE" });
    await refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const queryLower = query.toLowerCase();
  const filteredArticles = articles.filter((article) => getArticleTitle(article).toLowerCase().includes(queryLower));
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
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

      <aside className="sidebar">
        <section className="sidebar-section">
          <div className="sidebar-actions">
            <input className="input compact-input" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
            <button className="btn primary icon" title="Create article" onClick={createArticle}>
              <FilePlus2 size={18} />
            </button>
          </div>
          <div className="tree">{renderTree(filteredArticles, selected?.id, setSelectedId)}</div>
        </section>
      </aside>

      <section className="workspace">
        <div className="workspace-page-head">
          <div className="page-head-main">
            <a href={backHref} className="btn icon back-btn" title="Project overview" aria-label="Back to project overview">
              <ArrowLeft size={18} />
            </a>
            <div>
              <h1>{projectName}</h1>
              <p>Topic workspace</p>
            </div>
          </div>
        </div>

        {selected ? (
          <article className="article-paper" style={{ maxWidth: width }}>
            <div className="paper-toolbar">
              <div className="tool-row">
                <BookOpen size={18} />
                <span className="badge">{editable ? "Edit access" : "View only"}</span>
              </div>
              <div className="tool-row">
                <button className="btn primary" disabled={!editable} onClick={() => saveArticle(selected)}>
                  <Save size={16} /> Save
                </button>
                <button className="btn" onClick={() => setIsPropertiesOpen(true)}>
                  <PanelRightOpen size={16} /> Page settings
                </button>
                <button className="btn danger" disabled={!editable} onClick={deleteArticle}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
            <header className="article-header">
              <input
                className="title-input"
                value={getArticleTitle(selected)}
                disabled={!editable}
                onChange={(event) => {
                  const title = event.target.value;
                  setArticles((items) => items.map((item) => (item.id === selected.id ? { ...item, title } : item)));
                  saveArticle({ title });
                }}
              />
              <p className="muted">Stored in Postgres · Configure layout and permissions from Page settings</p>
            </header>
            <div className="editor-wrap">
              <RichEditor
                editable={editable}
                content={selected.content}
                onChange={(content) => {
                  setArticles((items) => items.map((item) => (item.id === selected.id ? { ...item, content } : item)));
                }}
              />
            </div>
          </article>
        ) : null}
      </section>

      <button
        className={`drawer-backdrop ${isPropertiesOpen ? "open" : ""}`}
        aria-label="Close page settings"
        onClick={() => setIsPropertiesOpen(false)}
      />
      <aside className={`properties-drawer ${isPropertiesOpen ? "open" : ""}`} aria-hidden={!isPropertiesOpen}>
        {selected ? (
          <>
            <div className="drawer-header">
              <div>
                <h2>Page settings</h2>
                <p className="muted">Layout, nesting, visibility, and access</p>
              </div>
              <button className="btn icon" title="Close" onClick={() => setIsPropertiesOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <section className="panel section">
              <h3>Page format</h3>
              <label className="field">
                <span>Layout</span>
                <select className="select" disabled={!editable} value={selected.layout} onChange={(event) => saveArticle({ layout: event.target.value })}>
                  <option value="wide">Wide canvas</option>
                  <option value="document">Document page</option>
                  <option value="compact">Compact note</option>
                </select>
              </label>
              <label className="field">
                <span>Move under article</span>
                <select
                  className="select"
                  disabled={!editable}
                  value={selected.parentId || ""}
                  onChange={(event) => saveArticle({ parentId: event.target.value || null })}
                >
                  <option value="">Root article</option>
                  {articles
                    .filter((article) => article.id !== selected.id && article.role === "EDIT" && !descendantIds.has(article.id))
                    .map((article) => (
                      <option key={article.id} value={article.id}>
                        {getArticleTitle(article)}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                <span>Visibility</span>
                <select
                  className="select"
                  disabled={!editable}
                  value={selected.visibility}
                  onChange={(event) => saveArticle({ visibility: event.target.value as Visibility })}
                >
                  <option value="CUSTOM">Custom permissions</option>
                  <option value="PUBLIC">Public view</option>
                </select>
              </label>
            </section>
            <section className="panel section">
              <h3>Permissions</h3>
              {users.map((user) => (
                <div className="permission-row" key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <div className="muted">{user.email}</div>
                  </div>
                  <select
                    className="select"
                    disabled={!editable}
                    value={selectedPermissions.find((permission) => permission.userId === user.id)?.role || "NONE"}
                    onChange={(event) => {
                      const permissions = upsertPermission(selectedPermissions, user.id, event.target.value as Role);
                      saveArticle({ permissions });
                    }}
                  >
                    <option value="NONE">No access</option>
                    <option value="VIEW">View</option>
                    <option value="EDIT">Edit</option>
                  </select>
                </div>
              ))}
            </section>
          </>
        ) : null}
      </aside>
    </main>
  );
}

function renderTree(
  articles: Article[],
  selectedId: string | undefined,
  select: (id: string) => void,
  parentId: string | null = null,
  depth = 0,
  path: Set<string> = new Set(),
) {
  const articleIds = new Set(articles.map((article) => article.id));

  let currentLevel = articles.filter((article) => normalizeParentId(article.parentId) === parentId);

  // Fallback for corrupted trees: if there is no root (parentId=null), render dangling/self-linked items as roots.
  if (depth === 0 && currentLevel.length === 0) {
    const fallbackRoots = articles.filter((article) => {
      const parent = normalizeParentId(article.parentId);
      return parent === null || parent === article.id || !articleIds.has(parent);
    });
    currentLevel = fallbackRoots.length > 0 ? fallbackRoots : articles;
  }

  return currentLevel.map((article) => {
      const hasCycle = path.has(article.id);
      const nextPath = new Set(path);
      nextPath.add(article.id);

      return (
        <div key={article.id}>
          <button
            className={`tree-item ${article.id === selectedId ? "active" : ""}`}
            style={{ marginLeft: depth * 18, width: `calc(100% - ${depth * 18}px)` }}
            onClick={() => select(article.id)}
          >
            <span>
              <span className="tree-title">{getArticleTitle(article)}</span>
              <span className="tree-meta">{article.role === "EDIT" ? "Can edit" : "Can view"}</span>
            </span>
            <span className="badge">{article.visibility === "PUBLIC" ? "Public" : "Custom"}</span>
          </button>
          {hasCycle ? null : renderTree(articles, selectedId, select, article.id, depth + 1, nextPath)}
        </div>
      );
    });
}

function normalizeParentId(parentId: string | null | undefined): string | null {
  if (typeof parentId !== "string") return null;
  const value = parentId.trim();
  return value || null;
}

function getDescendantIds(articles: Article[], articleId: string): string[] {
  const descendants: string[] = [];
  const visited = new Set<string>([articleId]);
  const stack = [articleId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId) continue;

    const children = articles.filter((article) => article.parentId === currentId);
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      descendants.push(child.id);
      stack.push(child.id);
    }
  }

  return descendants;
}

function getArticleTitle(article: Pick<Article, "title">): string {
  if (typeof article.title !== "string") return "Untitled";
  const normalized = article.title.trim();
  return normalized || "Untitled";
}

function getArticlePermissions(article: Pick<Article, "permissions"> | undefined): { userId: string; role: Role }[] {
  if (!article || !Array.isArray(article.permissions)) return [];
  return article.permissions.filter(
    (item): item is { userId: string; role: Role } =>
      !!item &&
      typeof item === "object" &&
      typeof item.userId === "string" &&
      (item.role === "NONE" || item.role === "VIEW" || item.role === "EDIT"),
  );
}

function upsertPermission(permissions: { userId: string; role: Role }[], userId: string, role: Role) {
  const existing = permissions.filter((permission) => permission.userId !== userId);
  return [...existing, { userId, role }];
}
