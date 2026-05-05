import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";

  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Topic name is required" }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { permissions: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const canManage =
    project.authorId === user.id ||
    project.permissions.some((permission) => permission.userId === user.id && permission.role === "EDIT");
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const topic = await prisma.topic.create({
    data: {
      projectId,
      name,
      description: description || null,
    },
    include: { _count: { select: { articles: true } } },
  });

  return NextResponse.json({
    id: topic.id,
    name: topic.name,
    description: topic.description,
    articleCount: topic._count.articles,
  });
}
