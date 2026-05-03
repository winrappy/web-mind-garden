"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Content } from "@tiptap/react";
import { BookOpen, FilePlus2, LogOut, PanelRightOpen, Save, Trash2, X } from "lucide-react";

const RichEditor = dynamic(() => import("@/components/rich-editor").then((module) => module.RichEditor), { ssr: false });

type Role = "NONE" | "VIEW" | "EDIT";
type Visibility = "CUSTOM" | "PUBLIC";

type Article = {
  id: string;
  title: string;
  parentId: string | null;
  layout: string;
  visibility: Visibility;
  content: Content;
  role: Role;
  permissions: { userId: string; role: Role }[];
  updatedAt: string;
};

type User = { id: string; name: string; email: string };

export function Workspace({
  currentUser,
  users,
  articles: initialArticles,
}: {
  currentUser: User;
  users: User[];
  articles: Article[];
}) {
  const [articles, setArticles] = useState(initialArticles);
  const [selectedId, setSelectedId] = useState(initialArticles[0]?.id);
  const [query, setQuery] = useState("");
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const selected = articles.find((article) => article.id === selectedId) || articles[0];
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
      body: JSON.stringify({ parentId: editable ? selected?.id : null }),
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

  const filteredArticles = articles.filter((article) => article.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" />
          <div>
            <h1>Mind Garden</h1>
            <p>Next.js article workspace</p>
          </div>
        </div>
        <div className="top-actions">
          <div className="account-menu">
            <button
              className="avatar account-trigger"
              aria-expanded={isAccountOpen}
              aria-label="Open account menu"
              onClick={() => setIsAccountOpen((value) => !value)}
            >
              {currentUser.name.slice(0, 1).toUpperCase()}
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
                value={selected.title}
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
                        {article.title}
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
                    value={selected.permissions.find((permission) => permission.userId === user.id)?.role || "NONE"}
                    onChange={(event) => {
                      const permissions = upsertPermission(selected.permissions, user.id, event.target.value as Role);
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

function renderTree(articles: Article[], selectedId: string | undefined, select: (id: string) => void, parentId: string | null = null, depth = 0) {
  return articles
    .filter((article) => article.parentId === parentId)
    .map((article) => (
      <div key={article.id}>
        <button
          className={`tree-item ${article.id === selectedId ? "active" : ""}`}
          style={{ marginLeft: depth * 18, width: `calc(100% - ${depth * 18}px)` }}
          onClick={() => select(article.id)}
        >
          <span>
            <span className="tree-title">{article.title}</span>
            <span className="tree-meta">{article.role === "EDIT" ? "Can edit" : "Can view"}</span>
          </span>
          <span className="badge">{article.visibility === "PUBLIC" ? "Public" : "Custom"}</span>
        </button>
        {renderTree(articles, selectedId, select, article.id, depth + 1)}
      </div>
    ));
}

function getDescendantIds(articles: Article[], articleId: string): string[] {
  const children = articles.filter((article) => article.parentId === articleId);
  return children.flatMap((child) => [child.id, ...getDescendantIds(articles, child.id)]);
}

function upsertPermission(permissions: { userId: string; role: Role }[], userId: string, role: Role) {
  const existing = permissions.filter((permission) => permission.userId !== userId);
  return [...existing, { userId, role }];
}
