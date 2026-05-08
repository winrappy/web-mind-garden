import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { canEditArticle, listProjectElevatedUserIds } from "@/lib/articles";
import { normalizeEditorContent } from "@/lib/articles";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.article.findUnique({
    where: { id },
    include: { permissions: true, project: { include: { permissions: true } }, topic: { select: { authorId: true } } },
  });
  const canEditByTopicOwner = existing?.topic?.authorId === user.id;
  if (!existing || (!canEditByTopicOwner && !canEditArticle(existing, user.id, existing.project ? {
    authorId: existing.project.authorId,
    permissions: existing.project.permissions.map((permission) => ({ userId: permission.userId, role: String(permission.role) })),
  } : null))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const data: Prisma.ArticleUpdateInput = {};

  if (typeof body.title === "string") data.title = body.title || "Untitled article";
  if ("content" in body) data.content = normalizeEditorContent(body.content);
  if (typeof body.layout === "string") data.layout = body.layout;
  if (body.visibility === "CUSTOM" || body.visibility === "PUBLIC") data.visibility = body.visibility;

  if ("parentId" in body) {
    const newParentId: string | null = body.parentId || null;
    if (newParentId) {
      // Guard: parent must be in the same topic
      const newParent = await prisma.article.findUnique({ where: { id: newParentId } });
      if (!newParent || newParent.topicId !== existing.topicId) {
        return NextResponse.json({ error: "Parent article does not belong to the same topic" }, { status: 400 });
      }
    }
    data.parent = newParentId ? { connect: { id: newParentId } } : { disconnect: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.article.update({ where: { id }, data });
    if (Array.isArray(body.permissions)) {
      const elevatedUserIds = listProjectElevatedUserIds(existing.project ? {
        authorId: existing.project.authorId,
        permissions: existing.project.permissions.map((permission) => ({ userId: permission.userId, role: String(permission.role) })),
      } : null);

      const sanitizedPermissions = body.permissions
        .filter((permission: unknown): permission is { userId: string; role: "NONE" | "VIEW" | "EDIT" } => {
          if (!permission || typeof permission !== "object") return false;
          const item = permission as { userId?: unknown; role?: unknown };
          return typeof item.userId === "string" && (item.role === "NONE" || item.role === "VIEW" || item.role === "EDIT");
        })
        .map((permission: { userId: string; role: "NONE" | "VIEW" | "EDIT" }) => ({ ...permission }));

      const protectedEditorIds = new Set<string>([existing.authorId, ...elevatedUserIds]);
      if (existing.topic?.authorId) {
        protectedEditorIds.add(existing.topic.authorId);
      }

      for (const protectedUserId of protectedEditorIds) {
        const found = sanitizedPermissions.find(
          (permission: { userId: string; role: "NONE" | "VIEW" | "EDIT" }) => permission.userId === protectedUserId,
        );
        if (found) {
          found.role = "EDIT";
        } else {
          sanitizedPermissions.push({ userId: protectedUserId, role: "EDIT" });
        }
      }

      await tx.permission.deleteMany({ where: { articleId: id } });
      await tx.permission.createMany({
        data: sanitizedPermissions.map((permission: { userId: string; role: "NONE" | "VIEW" | "EDIT" }) => ({
          articleId: id,
          userId: permission.userId,
          role: permission.role,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.article.findUnique({
    where: { id },
    include: { permissions: true, project: { include: { permissions: true } }, topic: { select: { authorId: true } } },
  });
  const canEditByTopicOwner = existing?.topic?.authorId === user.id;
  if (!existing || (!canEditByTopicOwner && !canEditArticle(existing, user.id, existing.project ? {
    authorId: existing.project.authorId,
    permissions: existing.project.permissions.map((permission) => ({ userId: permission.userId, role: String(permission.role) })),
  } : null))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.article.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
