import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roleForArticle, defaultContent, listProjectElevatedUserIds, normalizeEditorContent } from "@/lib/articles";
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

  const topic = await prisma.topic.findUnique({ where: { id: topicId }, select: { id: true, name: true, projectId: true, authorId: true } });
  if (!topic || topic.projectId !== projectId) notFound();

  const isOwner = project.authorId === user.id;
  const memberRole = String(project.permissions.find((permission) => permission.userId === user.id)?.role || "");
  const isMember = memberRole === "VIEW" || memberRole === "EDIT" || memberRole === "ADMIN";
  const isProjectElevated = isOwner || memberRole === "EDIT" || memberRole === "ADMIN";
  const isTopicOwner = topic.authorId === user.id;
  const canViewProject = project.visibility === "PUBLIC" || isOwner || isMember || isTopicOwner;
  if (!canViewProject) notFound();

  const [articles, users] = await Promise.all([
    prisma.article.findMany({
      where: { projectId, topicId },
      include: { permissions: true },
      orderBy: [{ parentId: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  const visibleArticles = articles
    .map((article) => ({
      ...article,
      role:
        topic.authorId === user.id
          ? "EDIT"
          : roleForArticle(article, user.id, {
              authorId: project.authorId,
              permissions: project.permissions.map((permission) => ({ userId: permission.userId, role: String(permission.role) })),
            }),
    }))
    .filter((article) => article.role !== "NONE");

  const canCreateArticle = isProjectElevated;
  if (!visibleArticles.length && canCreateArticle) {
    const elevatedUserIds = listProjectElevatedUserIds({
      authorId: project.authorId,
      permissions: project.permissions.map((permission) => ({ userId: permission.userId, role: String(permission.role) })),
    });

    const firstPermissions = [...new Set<string>([user.id, ...elevatedUserIds])].map((userId) => ({ userId, role: "EDIT" as const }));
    if (topic.authorId && !firstPermissions.some((permission) => permission.userId === topic.authorId)) {
      firstPermissions.push({ userId: topic.authorId, role: "EDIT" as const });
    }

    const first = await prisma.article.create({
      data: {
        title: "First article",
        projectId,
        topicId,
        authorId: user.id,
        content: defaultContent,
        permissions: { create: firstPermissions },
      },
    });
    redirect(`/projects/${projectId}/topics/${topicId}/articles?article=${first.id}`);
  }

  return (
    <Workspace
      projectId={projectId}
      topicId={topicId}
      projectName={`${project.name} / ${topic.name}`}
      topicName={topic.name}
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
        content: normalizeEditorContent(article.content) as never,
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
