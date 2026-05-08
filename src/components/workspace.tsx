"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Content } from "@tiptap/react";
import { BookOpen, Ellipsis, FilePlus2, Globe, Leaf, Lock, LogOut, PanelRightOpen, Save, Search, Settings, Shield, Trash2, X } from "lucide-react";

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
  topicName,
  backHref = "/",
  currentUser,
  users,
  articles: initialArticles,
}: {
  projectId: string;
  topicId: string;
  projectName: string;
  topicName: string;
  backHref?: string;
  currentUser: User;
  users: User[];
  articles: Article[];
}) {
  const [articles, setArticles] = useState(initialArticles);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newVisibility, setNewVisibility] = useState<"CUSTOM" | "PUBLIC">("CUSTOM");
  const [newPermissions, setNewPermissions] = useState<{ userId: string; role: Role }[]>(() =>
    buildInitialPermissions(users, currentUser.id)
  );
  const [isNewMembersModalOpen, setIsNewMembersModalOpen] = useState(false);
  const [newMemberSearch, setNewMemberSearch] = useState("");
  const [newPermissionMenuFor, setNewPermissionMenuFor] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [treeMenuFor, setTreeMenuFor] = useState<string | null>(null);
  const [pendingDeleteArticleId, setPendingDeleteArticleId] = useState<string | null>(null);
  const [isDeletingArticle, setIsDeletingArticle] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const selected = articles.find((article) => article.id === selectedId);
  const selectedPermissions = getArticlePermissions(selected);
  const editable = selected?.role === "EDIT";
  const canEditContent = editable && isEditorMode;
  const width = selected?.layout === "compact" ? 860 : selected?.layout === "wide" ? 1360 : 1120;
  const descendantIds = useMemo(() => new Set(selected ? getDescendantIds(articles, selected.id) : []), [articles, selected]);
  const rootArticleCount = useMemo(() => articles.filter((article) => normalizeParentId(article.parentId) === null).length, [articles]);
  const pendingDeleteArticle = articles.find((article) => article.id === pendingDeleteArticleId) || null;
  const pendingDeleteDescendantCount = useMemo(() => {
    if (!pendingDeleteArticleId) return 0;
    return getDescendantIds(articles, pendingDeleteArticleId).length;
  }, [articles, pendingDeleteArticleId]);
  const newMemberSearchLower = newMemberSearch.trim().toLowerCase();
  const filteredNewMembers = useMemo(() => {
    if (!newMemberSearchLower) return users;
    return users.filter((user) => {
      const label = `${user.name} ${user.email}`.toLowerCase();
      return label.includes(newMemberSearchLower);
    });
  }, [newMemberSearchLower, users]);
  const newRoleByUserId = useMemo(() => {
    const map: Record<string, Role> = {};
    for (const permission of newPermissions) {
      map[permission.userId] = permission.role;
    }
    return map;
  }, [newPermissions]);
  const filteredNewAccessibleMembers = useMemo(
    () => filteredNewMembers.filter((user) => (newRoleByUserId[user.id] || "NONE") !== "NONE"),
    [filteredNewMembers, newRoleByUserId],
  );
  const filteredNewNoAccessMembers = useMemo(
    () => filteredNewMembers.filter((user) => (newRoleByUserId[user.id] || "NONE") === "NONE"),
    [filteredNewMembers, newRoleByUserId],
  );
  const newAccessibleMemberCount = useMemo(
    () => users.filter((user) => (newRoleByUserId[user.id] || "NONE") !== "NONE").length,
    [newRoleByUserId, users],
  );

  useEffect(() => {
    setIsEditorMode(false);
    setTreeMenuFor(null);
  }, [selected?.id]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (treeMenuFor && !target.closest(".tree-item-action-wrap") && !target.closest(".tree-action-menu")) {
        setTreeMenuFor(null);
      }

      if (isAccountOpen && accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setIsAccountOpen(false);
      }

      if (newPermissionMenuFor && !target.closest(".member-menu-wrap") && !target.closest(".member-menu-inline")) {
        setNewPermissionMenuFor(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isAccountOpen, newPermissionMenuFor, treeMenuFor]);

  async function refresh() {
    window.location.reload();
  }

  async function saveArticle(patch: Partial<Article>) {
    if (!selected) return;
    await patchArticle(selected.id, patch);
  }

  async function patchArticle(articleId: string, patch: Partial<Article>) {
    const response = await fetch(`/api/articles/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (response.ok) {
      setArticles((items) => items.map((item) => (item.id === articleId ? { ...item, ...patch } : item)));
    }
  }

  function openNewModal(parentId: string | null = null) {
    setNewParentId(parentId);
    setNewTitle("");
    setNewVisibility("CUSTOM");
    setNewPermissions(buildInitialPermissions(users, currentUser.id));
    setNewMemberSearch("");
    setNewPermissionMenuFor(null);
    setIsNewMembersModalOpen(false);
    setIsNewModalOpen(true);
    setTreeMenuFor(null);
  }

  function closeNewModal() {
    if (isCreating) return;
    setIsNewModalOpen(false);
    setNewMemberSearch("");
    setNewPermissionMenuFor(null);
    setIsNewMembersModalOpen(false);
  }

  function updateNewMemberPermission(userId: string, role: Role) {
    setNewPermissions((items) => upsertPermission(items, userId, role));
    setNewPermissionMenuFor(null);
  }

  function renderNewMemberPermissionRow(user: User) {
    const role = newRoleByUserId[user.id] || "NONE";
    const disableActions = isCreating || user.id === currentUser.id;
    return (
      <label key={user.id} className="permission-row member-row">
        <div className="member-row-main">
          <span className="member-row-avatar" aria-hidden>
            {(user.name.slice(0, 1) || "?").toUpperCase()}
          </span>
          <div className="member-row-meta">
            <strong>{user.name}</strong>
            <div className="muted">{user.email}</div>
          </div>
        </div>
        <div className="member-row-actions">
          <span className={`member-access-label role-${role.toLowerCase()}`}>{roleLabelMap[role]}</span>
          <div className="member-menu-wrap">
            <button
              type="button"
              className="btn icon member-menu-btn"
              aria-label={`Change access for ${user.name}`}
              aria-expanded={newPermissionMenuFor === user.id}
              onClick={() => setNewPermissionMenuFor((prev) => (prev === user.id ? null : user.id))}
              disabled={disableActions}
            >
              <Ellipsis size={14} />
            </button>
            {newPermissionMenuFor === user.id ? (
              <div className="member-menu-inline" role="menu" aria-label={`Access options for ${user.name}`}>
                <div className="member-menu-segmented">
                  <button
                    type="button"
                    className={`member-menu-item role-view ${role === "VIEW" ? "is-active" : ""}`}
                    onClick={() => updateNewMemberPermission(user.id, "VIEW")}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className={`member-menu-item role-edit ${role === "EDIT" ? "is-active" : ""}`}
                    onClick={() => updateNewMemberPermission(user.id, "EDIT")}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`member-menu-item role-none ${role === "NONE" ? "is-active" : ""}`}
                    onClick={() => updateNewMemberPermission(user.id, "NONE")}
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

  async function createArticle(parentId: string | null = null) {
    setIsCreating(true);
    try {
      const nextTitle = newTitle.trim() || "Untitled article";
      const nextPermissions = getArticlePermissions({ permissions: newPermissions });

      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId, projectId, topicId, title: nextTitle, visibility: newVisibility }),
      });

      if (!response.ok) return;
      const article = await response.json();

      const patch: Partial<Article> = {
        title: nextTitle,
        visibility: newVisibility,
      };
      if (newVisibility === "CUSTOM") {
        patch.permissions = nextPermissions;
      }

      await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const articleForState = {
        ...article,
        title: patch.title ?? article.title,
        visibility: patch.visibility ?? article.visibility,
        permissions: patch.permissions ?? article.permissions,
      };

      setArticles((items) => [articleForState, ...items]);
      setSelectedId(articleForState.id);
      closeNewModal();
    } finally {
      setIsCreating(false);
    }
  }

  async function deleteArticle() {
    if (!selected || !editable) return;
    setPendingDeleteArticleId(selected.id);
  }

  async function deleteArticleById(articleId: string) {
    const article = articles.find((item) => item.id === articleId);
    if (!article || article.role !== "EDIT") return;
    setPendingDeleteArticleId(articleId);
    setTreeMenuFor(null);
  }

  async function moveArticleToRoot(articleId: string) {
    await patchArticle(articleId, { parentId: null });
    setTreeMenuFor(null);
  }

  function openArticleSettings(articleId: string) {
    setSelectedId(articleId);
    setIsPropertiesOpen(true);
    setTreeMenuFor(null);
  }

  function closeDeleteModal() {
    if (isDeletingArticle) return;
    setPendingDeleteArticleId(null);
  }

  async function confirmDeleteArticle() {
    if (!pendingDeleteArticleId || isDeletingArticle) return;
    setIsDeletingArticle(true);
    try {
      await fetch(`/api/articles/${pendingDeleteArticleId}`, { method: "DELETE" });
      setPendingDeleteArticleId(null);
      setTreeMenuFor(null);
      await refresh();
    } finally {
      setIsDeletingArticle(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const queryLower = query.toLowerCase();
  const filteredArticles = articles
    .filter((article) => getArticleTitle(article).toLowerCase().includes(queryLower))
    .sort((a, b) =>
      getArticleTitle(a).localeCompare(getArticleTitle(b), ["th", "en"], { sensitivity: "base", numeric: true })
    );
  return (
    <main className="app-shell article-theme">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Leaf size={16} strokeWidth={1.9} />
          </div>
          <h1>Mind Garden</h1>
        </div>
        <div className="top-actions">
          <div className="account-menu" ref={accountMenuRef}>
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

      <aside className="sidebar" onClick={() => setTreeMenuFor(null)}>
        <div className="sidebar-topic-nav">
          <button
            className={`sidebar-topic-title ${!selected ? "active" : ""}`}
            onClick={() => setSelectedId(undefined)}
            title="Topic overview"
          >
            <span className="sidebar-topic-name">{topicName}</span>
          </button>
        </div>

        <section className="sidebar-section">
          <div className="sidebar-articles-header">
            <span className="sidebar-articles-label">Articles</span>
            <div className="sidebar-articles-actions">
              <span className="article-sidebar-list-count">{filteredArticles.length}</span>
              <button className="btn icon sidebar-new-btn" title="New article" onClick={() => openNewModal(null)}>
                <FilePlus2 size={15} />
              </button>
            </div>
          </div>
          <div className="article-sidebar-search" onClick={(event) => event.stopPropagation()}>
            <Search size={14} />
            <input className="input compact-input article-sidebar-search-input" placeholder="Search…" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="tree" onClick={(event) => event.stopPropagation()}>
            {renderTree(
              filteredArticles,
              selected?.id,
              (articleId) => {
                setTreeMenuFor(null);
                setSelectedId(articleId);
              },
              (parentId) => openNewModal(parentId),
              treeMenuFor,
              (articleId) => setTreeMenuFor((current) => (current === articleId ? null : articleId)),
              openArticleSettings,
              moveArticleToRoot,
              deleteArticleById,
            )}
          </div>
        </section>
      </aside>

      <section className="workspace">
        <div className="workspace-page-head pd-header">
          <div className="pd-header-left">
            <div className="pd-title-block">
              <h1 className="pd-title">{projectName}</h1>
              <p className="pd-subtitle muted">Topic workspace</p>
            </div>
          </div>
        </div>

        {!selected ? (
          <div className="article-detail-card" style={{ maxWidth: 1120 }}>
            <div className="article-detail-header">
              <h2 className="article-detail-title">{projectName}</h2>
              <div className="article-detail-meta">
                <span className="badge">{articles.length} article{articles.length !== 1 ? "s" : ""}</span>
                <span className="badge">{rootArticleCount} root page{rootArticleCount !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="article-detail-actions">
              <button className="btn primary" onClick={() => openNewModal(null)}>
                <FilePlus2 size={16} /> New article
              </button>
              <a href={backHref} className="btn">
                <Settings size={16} /> Topic settings
              </a>
            </div>
            {articles.length > 0 ? (
              <div className="article-detail-info">
                {articles.filter((a) => !normalizeParentId(a.parentId)).map((a) => (
                  <div key={a.id} className="article-detail-stat article-detail-row">
                    <span className="article-detail-stat-label">{getArticleTitle(a)}</span>
                    <button className="btn" onClick={() => setSelectedId(a.id)}>
                      <BookOpen size={14} /> Open
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {selected ? (
          <article className="article-paper" style={{ maxWidth: width }}>
            <div className="paper-toolbar">
              <div className="tool-row">
                <BookOpen size={18} />
                <span className="badge">{editable ? "Edit access" : "View only"}</span>
              </div>
              <div className="tool-row">
                {editable ? (
                  <button className={`btn ${canEditContent ? "" : "primary"}`} onClick={() => setIsEditorMode((value) => !value)}>
                    {canEditContent ? "Stop editing" : "Edit"}
                  </button>
                ) : null}
                <button className="btn primary" disabled={!canEditContent} onClick={() => saveArticle(selected)}>
                  <Save size={16} /> Save
                </button>
                <button className="btn" onClick={() => setIsPropertiesOpen(true)}>
                  <PanelRightOpen size={16} /> Page settings
                </button>
              </div>
            </div>
            <header className="article-header">
              <input
                className="title-input"
                value={getArticleTitle(selected)}
                disabled={!canEditContent}
                onChange={(event) => {
                  const title = event.target.value;
                  setArticles((items) => items.map((item) => (item.id === selected.id ? { ...item, title } : item)));
                  saveArticle({ title });
                }}
              />
              <p className="muted">
                Stored in Postgres · Configure layout and permissions from Page settings
                {editable && !canEditContent ? " · Read mode (click Edit to modify content)" : ""}
              </p>
            </header>
            <div className="editor-wrap">
              <RichEditor
                editable={canEditContent}
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
              <div className="pd-drawer-head-actions">
                <button className="btn icon" title="Close" onClick={() => setIsPropertiesOpen(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <section className="panel section settings-section">
              <div className="settings-section-header">
                <div className="settings-section-icon icon-blue"><Settings size={15} /></div>
                <div className="settings-section-label">
                  <strong>Page format</strong>
                  <span>Hierarchy and visibility</span>
                </div>
              </div>
              <div className="settings-fields">
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
              </div>
            </section>
            <section className="panel section settings-section">
              <div className="settings-section-header">
                <div className="settings-section-icon icon-teal"><Shield size={15} /></div>
                <div className="settings-section-label">
                  <strong>Permissions</strong>
                  <span>Manage article access for each member</span>
                </div>
              </div>
              <div className="settings-fields">
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
              </div>
            </section>
            <section className="panel section settings-section">
              <div className="settings-section-header">
                <div className="settings-section-icon icon-red"><Trash2 size={15} /></div>
                <div className="settings-section-label">
                  <strong>Danger zone</strong>
                  <span>Permanently remove this article</span>
                </div>
              </div>
              <div className="settings-fields">
                <button className="btn danger" disabled={!editable} onClick={deleteArticle}>
                  <Trash2 size={16} /> Delete article
                </button>
              </div>
            </section>
          </>
        ) : null}
      </aside>

      {isNewModalOpen ? (
        <div className="modal-backdrop" onClick={closeNewModal}>
          <div className="modal-box modal-box-new" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="New article">
            <div className="modal-accent-head modal-accent-head-blue">
              <div className="modal-accent-icon modal-accent-icon-blue"><FilePlus2 size={22} /></div>
              <div>
                <h2>New article</h2>
                <p>{newParentId ? "Adding a child page" : "Adding a root page"}</p>
              </div>
              <button className="btn icon modal-close-btn" onClick={closeNewModal} disabled={isCreating}>
                <X size={18} />
              </button>
            </div>
            <div className="settings-section new-article-fields">
              <label className="field">
                <span>Title</span>
                <input
                  className="input"
                  placeholder="Untitled"
                  value={newTitle}
                  autoFocus
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createArticle(newParentId); }}
                />
              </label>
              <div className="field field-visibility-cards">
                <span>Visibility</span>
                <div className="visibility-cards">
                  <button
                    type="button"
                    className={`visibility-card${newVisibility === "PUBLIC" ? " is-active" : ""}`}
                    onClick={() => {
                      setNewVisibility("PUBLIC");
                      setNewPermissionMenuFor(null);
                      setIsNewMembersModalOpen(false);
                    }}
                    disabled={isCreating}
                  >
                    <Globe size={20} />
                    <strong>Public view</strong>
                    <span>Anyone can read this article</span>
                  </button>
                  <button
                    type="button"
                    className={`visibility-card${newVisibility === "CUSTOM" ? " is-active" : ""}`}
                    onClick={() => setNewVisibility("CUSTOM")}
                    disabled={isCreating}
                  >
                    <Lock size={20} />
                    <strong>Custom permissions</strong>
                    <span>Use role-based access controls</span>
                  </button>
                </div>
              </div>
              {newVisibility === "CUSTOM" ? (
                <div className="field">
                  <span>Member access</span>
                  <div className="member-access-inline new-member-access-inline">
                    <button
                      className="btn member-access-trigger"
                      onClick={() => {
                        setNewPermissionMenuFor(null);
                        setIsNewMembersModalOpen(true);
                      }}
                      disabled={isCreating}
                    >
                      {newAccessibleMemberCount} member{newAccessibleMemberCount !== 1 ? "s" : ""} can access
                    </button>
                    <p className="member-access-hint muted">Choose who can view or edit this article.</p>
                  </div>
                </div>
              ) : (
                <p className="new-permissions-note muted">Public view allows anyone to read this article.</p>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeNewModal} disabled={isCreating}>Cancel</button>
              <button type="button" className="btn primary" onClick={() => createArticle(newParentId)} disabled={isCreating}>
                <FilePlus2 size={16} /> {isCreating ? "Creating..." : "Create article"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isNewModalOpen && newVisibility === "CUSTOM" && isNewMembersModalOpen ? (
        <div className="member-modal-overlay new-article-member-overlay">
          <div
            className="member-modal-backdrop"
            onClick={() => {
              setNewPermissionMenuFor(null);
              setIsNewMembersModalOpen(false);
            }}
            aria-hidden
          />
          <div className="member-modal" role="dialog" aria-modal="true" aria-label="Manage article members">
            <div className="member-modal-head">
              <h4>Manage member access</h4>
              <button
                className="btn icon"
                onClick={() => {
                  setNewPermissionMenuFor(null);
                  setIsNewMembersModalOpen(false);
                }}
                aria-label="Close member access modal"
              >
                <X size={15} />
              </button>
            </div>
            <input
              className="input"
              placeholder="Search by name or email…"
              value={newMemberSearch}
              onChange={(event) => setNewMemberSearch(event.target.value)}
              disabled={isCreating}
            />
            <div className="project-permission-list member-modal-list">
              {filteredNewMembers.length > 0 ? (
                <>
                  <div className="member-modal-group">
                    <div className="member-modal-group-title">Members with access ({filteredNewAccessibleMembers.length})</div>
                    {filteredNewAccessibleMembers.length > 0 ? filteredNewAccessibleMembers.map(renderNewMemberPermissionRow) : (
                      <p className="member-group-empty muted">No members currently have access.</p>
                    )}
                  </div>

                  <div className="member-modal-group member-modal-group-muted">
                    <div className="member-modal-group-title">Members without access ({filteredNewNoAccessMembers.length})</div>
                    {filteredNewNoAccessMembers.length > 0 ? filteredNewNoAccessMembers.map(renderNewMemberPermissionRow) : (
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

      {pendingDeleteArticle ? (
        <div className="modal-backdrop" onClick={closeDeleteModal}>
          <div className="modal-box" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Confirm article deletion">
            <div className="modal-accent-head">
              <div className="modal-accent-icon"><Trash2 size={22} /></div>
              <div>
                <h2>Delete article</h2>
                <p>Review this action before removing the page permanently.</p>
              </div>
              <button className="btn icon modal-close-btn" onClick={closeDeleteModal} aria-label="Close delete confirmation" disabled={isDeletingArticle}>
                <X size={18} />
              </button>
            </div>

            <div className="settings-section">
              <div className="settings-section-header">
                <div className="settings-section-icon icon-red"><Trash2 size={15} /></div>
                <div className="settings-section-label">
                  <strong>{getArticleTitle(pendingDeleteArticle)}</strong>
                  <span>
                    {pendingDeleteDescendantCount > 0
                      ? `${pendingDeleteDescendantCount} nested page${pendingDeleteDescendantCount !== 1 ? "s" : ""} may also be affected.`
                      : "This action cannot be undone."}
                  </span>
                </div>
              </div>
              <p className="modal-confirm-copy muted">
                This will permanently remove the selected article from the topic workspace.
              </p>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeDeleteModal} disabled={isDeletingArticle}>Cancel</button>
              <button type="button" className="btn danger" onClick={confirmDeleteArticle} disabled={isDeletingArticle}>
                <Trash2 size={16} /> {isDeletingArticle ? "Deleting..." : "Delete article"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function renderTree(
  articles: Article[],
  selectedId: string | undefined,
  select: (id: string) => void,
  createChild: (parentId: string) => void,
  treeMenuFor: string | null,
  toggleMenu: (articleId: string) => void,
  openSettings: (articleId: string) => void,
  moveToRoot: (articleId: string) => void,
  deleteById: (articleId: string) => void,
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

  return currentLevel.map((article, index) => {
      const hasCycle = path.has(article.id);
      const nextPath = new Set(path);
      nextPath.add(article.id);
      const nodeKey = `${parentId ?? "root"}:${depth}:${article.id}:${index}`;

      return (
        <div key={nodeKey} className="tree-node">
          <div className="tree-row" style={{ paddingLeft: `${depth * 16}px` }}>
            <div className={`tree-item ${article.id === selectedId ? "active" : ""}`}>
              <button
                type="button"
                className="tree-item-select"
                onClick={() => select(article.id)}
              >
                <span className="tree-title">{getArticleTitle(article)}</span>
              </button>
              {article.role === "EDIT" ? (
                <div className="tree-item-action-wrap">
                  <button
                    type="button"
                    className={`tree-item-action ${treeMenuFor === article.id ? "active" : ""}`}
                    title="Open article actions"
                    aria-label={`Open article actions for ${getArticleTitle(article)}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleMenu(article.id);
                    }}
                  >
                    <Ellipsis size={15} />
                  </button>
                  {treeMenuFor === article.id ? (
                    <div className="tree-action-menu" onClick={(event) => event.stopPropagation()}>
                      <button type="button" className="tree-action-menu-btn" onClick={() => createChild(article.id)}>
                        Add child article
                      </button>
                      <button type="button" className="tree-action-menu-btn" onClick={() => openSettings(article.id)}>
                        Open settings
                      </button>
                      {normalizeParentId(article.parentId) ? (
                        <button type="button" className="tree-action-menu-btn" onClick={() => moveToRoot(article.id)}>
                          Move to root
                        </button>
                      ) : null}
                      <button type="button" className="tree-action-menu-btn danger" onClick={() => deleteById(article.id)}>
                        Delete article
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          {hasCycle ? null : renderTree(articles, selectedId, select, createChild, treeMenuFor, toggleMenu, openSettings, moveToRoot, deleteById, article.id, depth + 1, nextPath)}
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

function buildInitialPermissions(users: User[], currentUserId: string) {
  return users.map((user): { userId: string; role: Role } => ({
    userId: user.id,
    role: user.id === currentUserId ? "EDIT" : "NONE",
  }));
}

const roleLabelMap: Record<Role, string> = {
  NONE: "No access",
  VIEW: "Can view",
  EDIT: "Can edit",
};
