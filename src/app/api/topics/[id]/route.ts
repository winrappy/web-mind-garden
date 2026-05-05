import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: { project: { include: { permissions: true } } },
  });
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  const canEdit =
    topic.project.authorId === user.id ||
    topic.project.permissions.some((permission) => permission.userId === user.id && permission.role === "EDIT");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const data: { name?: string; description?: string | null } = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if ("description" in body) {
    data.description = typeof body.description === "string" ? body.description.trim() || null : null;
  }

  const updated = await prisma.topic.update({
    where: { id },
    data,
    include: { _count: { select: { articles: true } } },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    articleCount: updated._count.articles,
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: { project: { include: { permissions: true } } },
  });
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  const canEdit =
    topic.project.authorId === user.id ||
    topic.project.permissions.some((permission) => permission.userId === user.id && permission.role === "EDIT");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.topic.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
