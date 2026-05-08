import { ArticleVisibility, PermissionRole, Prisma } from "@prisma/client";

type ProjectAccess = {
  authorId: string;
  permissions: { userId: string; role: string }[];
};

export const defaultContent: Prisma.InputJsonValue = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Article heading" }] },
    { type: "paragraph", content: [{ type: "text", text: "Start writing your article in the editor." }] },
  ],
};

export function normalizeEditorContent(content: unknown): Prisma.InputJsonValue {
  if (!content || typeof content !== "object") return defaultContent;

  const root = content as { type?: unknown; content?: unknown };
  if (root.type !== "doc") return defaultContent;
  if (!Array.isArray(root.content)) return defaultContent;

  return content as Prisma.InputJsonValue;
}

export function canViewArticle(article: {
  visibility: ArticleVisibility;
  permissions: { userId: string; role: PermissionRole }[];
}, userId: string, project?: ProjectAccess | null) {
  if (hasProjectElevatedAccess(project, userId)) return true;
  if (article.visibility === ArticleVisibility.PUBLIC) return true;
  return article.permissions.some((permission) => permission.userId === userId && permission.role !== PermissionRole.NONE);
}

export function canEditArticle(article: {
  authorId: string;
  permissions: { userId: string; role: PermissionRole }[];
}, userId: string, project?: ProjectAccess | null) {
  return (
    hasProjectElevatedAccess(project, userId) ||
    article.authorId === userId ||
    article.permissions.some((permission) => permission.userId === userId && permission.role === PermissionRole.EDIT)
  );
}

export function roleForArticle(article: {
  visibility: ArticleVisibility;
  authorId: string;
  permissions: { userId: string; role: PermissionRole }[];
}, userId: string, project?: ProjectAccess | null) {
  if (hasProjectElevatedAccess(project, userId)) return PermissionRole.EDIT;
  if (article.authorId === userId) return PermissionRole.EDIT;
  const explicit = article.permissions.find((permission) => permission.userId === userId)?.role;
  if (explicit) return explicit;
  return article.visibility === ArticleVisibility.PUBLIC ? PermissionRole.VIEW : PermissionRole.NONE;
}

export function hasProjectElevatedAccess(project: ProjectAccess | null | undefined, userId: string) {
  if (!project) return false;
  if (project.authorId === userId) return true;
  return project.permissions.some((permission) => {
    if (permission.userId !== userId) return false;
    const role = String(permission.role);
    return role === "EDIT" || role === "ADMIN";
  });
}

export function listProjectElevatedUserIds(project: ProjectAccess | null | undefined) {
  if (!project) return [] as string[];
  const ids = new Set<string>([project.authorId]);
  for (const permission of project.permissions) {
    const role = String(permission.role);
    if (role === "EDIT" || role === "ADMIN") {
      ids.add(permission.userId);
    }
  }
  return [...ids];
}
