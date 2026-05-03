import { ArticleVisibility, PermissionRole, Prisma } from "@prisma/client";

export const defaultContent: Prisma.InputJsonValue = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Article heading" }] },
    { type: "paragraph", content: [{ type: "text", text: "Start writing your article in the editor." }] },
  ],
};

export function canViewArticle(article: {
  visibility: ArticleVisibility;
  permissions: { userId: string; role: PermissionRole }[];
}, userId: string) {
  if (article.visibility === ArticleVisibility.PUBLIC) return true;
  return article.permissions.some((permission) => permission.userId === userId && permission.role !== PermissionRole.NONE);
}

export function canEditArticle(article: {
  authorId: string;
  permissions: { userId: string; role: PermissionRole }[];
}, userId: string) {
  return (
    article.authorId === userId ||
    article.permissions.some((permission) => permission.userId === userId && permission.role === PermissionRole.EDIT)
  );
}

export function roleForArticle(article: {
  visibility: ArticleVisibility;
  authorId: string;
  permissions: { userId: string; role: PermissionRole }[];
}, userId: string) {
  if (article.authorId === userId) return PermissionRole.EDIT;
  const explicit = article.permissions.find((permission) => permission.userId === userId)?.role;
  if (explicit) return explicit;
  return article.visibility === ArticleVisibility.PUBLIC ? PermissionRole.VIEW : PermissionRole.NONE;
}
