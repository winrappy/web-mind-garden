import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, include: { permissions: true } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isOwner = project.authorId === user.id;
  const isMember = project.permissions.some((permission) => permission.userId === user.id);
  const canEditDescription = isOwner || isMember;
  if (!canEditDescription) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  if (!isOwner) {
    const disallowed = ["name", "imageUrl", "visibility", "memberIds"].some((key) => key in body);
    if (disallowed) {
      return NextResponse.json({ error: "Only project owner can update project settings" }, { status: 403 });
    }
  }

  const data: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if ("description" in body) data.description = typeof body.description === "string" ? body.description.trim() || null : null;
  if ("imageUrl" in body) data.imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null;
  if (body.visibility === "PUBLIC" || body.visibility === "RESTRICTED") data.visibility = body.visibility;

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data });
    if (Array.isArray(body.memberIds)) {
      const memberIds: string[] = body.memberIds.filter((mid: unknown) => typeof mid === "string" && mid !== user.id);
      await tx.projectPermission.deleteMany({ where: { projectId: id } });
      if (memberIds.length > 0) {
        await tx.projectPermission.createMany({
          data: memberIds.map((userId) => ({ projectId: id, userId })),
          skipDuplicates: true,
        });
      }
    }
  });

  const updated = await prisma.project.findUnique({
    where: { id },
    include: { permissions: { include: { user: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.authorId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
