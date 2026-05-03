import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { defaultContent, roleForArticle } from "@/lib/articles";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parentId = typeof body.parentId === "string" ? body.parentId : null;

  const article = await prisma.article.create({
    data: {
      title: "Untitled article",
      parentId,
      authorId: user.id,
      content: defaultContent,
      permissions: { create: { userId: user.id, role: "EDIT" } },
    },
    include: { permissions: true },
  });

  return NextResponse.json({
    id: article.id,
    title: article.title,
    parentId: article.parentId,
    layout: article.layout,
    visibility: article.visibility,
    content: article.content,
    role: roleForArticle(article, user.id),
    permissions: article.permissions.map((permission) => ({ userId: permission.userId, role: permission.role })),
    updatedAt: article.updatedAt.toISOString(),
  });
}
