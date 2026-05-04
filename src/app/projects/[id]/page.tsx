import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectOverview } from "@/components/project-overview";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { permissions: true },
  });
  if (!project) notFound();

  const isOwner = project.authorId === user.id;
  const isMember = project.permissions.some((permission) => permission.userId === user.id);
  const canView = project.visibility === "PUBLIC" || isOwner || isMember;
  if (!canView) notFound();

  const canEditDescription = isOwner || isMember;

  const topics = await prisma.topic.findMany({
    where: { projectId },
    include: { _count: { select: { articles: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <ProjectOverview
      projectId={project.id}
      name={project.name}
      imageUrl={project.imageUrl}
      visibility={project.visibility}
      description={project.description}
      canEdit={canEditDescription}
      topics={topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        description: topic.description,
        articleCount: topic._count.articles,
      }))}
      currentUser={{ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }}
    />
  );
}
