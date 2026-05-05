import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roleForArticle, defaultContent } from "@/lib/articles";
import { Workspace } from "@/components/workspace";

type RoleString = "NONE" | "VIEW" | "EDIT";

export default async function TopicArticlesPage({
  params,
}: {
  params: Promise<{ id: string; topicId: string }>;
}) {
  const { id: projectId, topicId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { permissions: true },
  });
  if (!project) notFound();

  const isOwner = project.authorId === user.id;
  const memberRole = project.permissions.find((permission) => permission.userId === user.id)?.role;
  const isMember = memberRole === "VIEW" || memberRole === "EDIT";
  const canViewProject = project.visibility === "PUBLIC" || isOwner || isMember;
  if (!canViewProject) notFound();

  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic || topic.projectId !== projectId) notFound();

  const [articles, users] = await Promise.all([
    prisma.article.findMany({
      where: { projectId, topicId },
      include: { permissions: true },
      orderBy: [{ parentId: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  const visibleArticles = articles
    .map((article) => ({ ...article, role: roleForArticle(article, user.id) }))
    .filter((article) => article.role !== "NONE");

  const canCreateArticle = isOwner || memberRole === "EDIT";
  if (!visibleArticles.length && canCreateArticle) {
    const first = await prisma.article.create({
      data: {
        title: "First article",
        projectId,
        topicId,
        authorId: user.id,
        content: defaultContent,
        permissions: { create: { userId: user.id, role: "EDIT" } },
      },
    });
    redirect(`/projects/${projectId}/topics/${topicId}/articles?article=${first.id}`);
  }

  return (
    <Workspace
      projectId={projectId}
      topicId={topicId}
      projectName={`${project.name} / ${topic.name}`}
      backHref={`/projects/${projectId}`}
      currentUser={{ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }}
      users={users.map((item) => ({ id: item.id, name: item.name, email: item.email }))}
      articles={visibleArticles.map((article) => ({
        id: article.id,
        title: article.title,
        parentId: article.parentId,
        projectId: article.projectId,
        topicId: article.topicId,
        layout: article.layout,
        visibility: article.visibility,
        content: article.content as never,
        role: article.role as RoleString,
        permissions: article.permissions.map((permission) => ({
          userId: permission.userId,
          role: permission.role as RoleString,
        })),
        updatedAt: article.updatedAt.toISOString(),
      }))}
    />
  );
}
