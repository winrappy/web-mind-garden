import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { defaultContent, listProjectElevatedUserIds, roleForArticle } from "@/lib/articles";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parentId = typeof body.parentId === "string" ? body.parentId : null;
  const projectId = typeof body.projectId === "string" ? body.projectId : null;
  const topicId = typeof body.topicId === "string" ? body.topicId : null;

  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  if (!topicId) return NextResponse.json({ error: "topicId is required" }, { status: 400 });

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { project: { include: { permissions: true } } },
  });
  if (!topic || topic.projectId !== projectId) {
    return NextResponse.json({ error: "Topic not found in project" }, { status: 404 });
  }

  const canEditProject =
    topic.project.authorId === user.id ||
    topic.project.permissions.some((permission) => {
      if (permission.userId !== user.id) return false;
      const role = String(permission.role);
      return role === "EDIT" || role === "ADMIN";
    });
  if (!canEditProject) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // When a parent is specified it must belong to the same topic
  if (parentId) {
    const parent = await prisma.article.findUnique({ where: { id: parentId } });
    if (!parent || parent.topicId !== topicId) {
      return NextResponse.json({ error: "Parent article does not belong to the same topic" }, { status: 400 });
    }
  }

  // Permissions: child articles inherit from the root ancestor; root articles use project-elevated defaults
  let permissionData: { userId: string; role: "EDIT" | "VIEW" | "NONE" }[];
  if (parentId) {
    let rootId = parentId;
    const visitedIds = new Set<string>();
    while (true) {
      if (visitedIds.has(rootId)) break;
      visitedIds.add(rootId);
      const ancestor = await prisma.article.findUnique({ where: { id: rootId }, select: { parentId: true } });
      if (!ancestor?.parentId) break;
      rootId = ancestor.parentId;
    }
    const rootArticle = await prisma.article.findUnique({ where: { id: rootId }, include: { permissions: true } });
    permissionData = (rootArticle?.permissions ?? []).map((p) => ({ userId: p.userId, role: p.role as "EDIT" | "VIEW" | "NONE" }));
    if (!permissionData.some((p) => p.userId === user.id)) {
      permissionData.push({ userId: user.id, role: "EDIT" });
    }
  } else {
    const elevatedUserIds = listProjectElevatedUserIds({
      authorId: topic.project.authorId,
      permissions: topic.project.permissions.map((permission) => ({
        userId: permission.userId,
        role: String(permission.role),
      })),
    });
    permissionData = [...new Set<string>([user.id, ...elevatedUserIds])].map((userId) => ({ userId, role: "EDIT" as const }));
    if (topic.authorId && !permissionData.some((item) => item.userId === topic.authorId)) {
      permissionData.push({ userId: topic.authorId, role: "EDIT" as const });
    }
  }

  const article = await prisma.article.create({
    data: {
      title: "Untitled article",
      parentId,
      projectId,
      topicId,
      authorId: user.id,
      content: defaultContent,
      permissions: { create: permissionData },
    },
    include: { permissions: true },
  });

  return NextResponse.json({
    id: article.id,
    title: article.title,
    parentId: article.parentId,
    projectId: article.projectId,
    topicId: article.topicId,
    layout: article.layout,
    visibility: article.visibility,
    content: article.content,
    role: roleForArticle(
      article,
      user.id,
      {
        authorId: topic.project.authorId,
        permissions: topic.project.permissions.map((permission) => ({ userId: permission.userId, role: String(permission.role) })),
      },
    ),
    permissions: article.permissions.map((permission) => ({ userId: permission.userId, role: permission.role })),
    updatedAt: article.updatedAt.toISOString(),
  });
}
