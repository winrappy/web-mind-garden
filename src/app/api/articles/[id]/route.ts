import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { canEditArticle } from "@/lib/articles";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.article.findUnique({ where: { id }, include: { permissions: true } });
  if (!existing || !canEditArticle(existing, user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const data: Prisma.ArticleUpdateInput = {};

  if (typeof body.title === "string") data.title = body.title || "Untitled article";
  if (body.content) data.content = body.content;
  if (typeof body.layout === "string") data.layout = body.layout;
  if (body.visibility === "CUSTOM" || body.visibility === "PUBLIC") data.visibility = body.visibility;
  if ("parentId" in body) data.parent = body.parentId ? { connect: { id: body.parentId } } : { disconnect: true };

  await prisma.$transaction(async (tx) => {
    await tx.article.update({ where: { id }, data });
    if (Array.isArray(body.permissions)) {
      await tx.permission.deleteMany({ where: { articleId: id } });
      await tx.permission.createMany({
        data: body.permissions.map((permission: { userId: string; role: "NONE" | "VIEW" | "EDIT" }) => ({
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
  const existing = await prisma.article.findUnique({ where: { id }, include: { permissions: true } });
  if (!existing || !canEditArticle(existing, user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.article.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
