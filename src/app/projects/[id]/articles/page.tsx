import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ProjectArticlesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const firstTopic = await prisma.topic.findFirst({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!firstTopic) {
    redirect(`/projects/${projectId}`);
  }

  redirect(`/projects/${projectId}/topics/${firstTopic.id}/articles`);
}
