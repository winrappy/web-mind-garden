import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Project name is required" }, { status: 400 });

  const description = typeof body.description === "string" ? body.description.trim() : null;
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : null;
  const visibility = body.visibility === "RESTRICTED" ? "RESTRICTED" : "PUBLIC";
  const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds.filter((id: unknown) => typeof id === "string") : [];

  const project = await prisma.project.create({
    data: {
      name,
      description: description || null,
      imageUrl: imageUrl || null,
      visibility,
      authorId: user.id,
      permissions: memberIds.length > 0
        ? { create: memberIds.map((userId) => ({ userId })) }
        : undefined,
    },
    include: { permissions: { include: { user: true } } },
  });

  return NextResponse.json(project, { status: 201 });
}
