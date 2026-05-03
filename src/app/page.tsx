import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roleForArticle } from "@/lib/articles";
import { AuthView } from "@/components/auth-view";
import { Workspace } from "@/components/workspace";

type RoleString = "NONE" | "VIEW" | "EDIT";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <AuthView />;

  const [articles, users] = await Promise.all([
    prisma.article.findMany({
      include: { permissions: true },
      orderBy: [{ parentId: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  const visibleArticles = articles
    .map((article) => ({ ...article, role: roleForArticle(article, user.id) }))
    .filter((article) => article.role !== "NONE");

  if (!visibleArticles.length) {
    const first = await prisma.article.create({
      data: {
        title: "First article",
        authorId: user.id,
        content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Start writing your article." }] }] },
        permissions: { create: { userId: user.id, role: "EDIT" } },
      },
    });
    redirect(`/?article=${first.id}`);
  }

  return (
    <Workspace
      currentUser={{ id: user.id, name: user.name, email: user.email }}
      users={users.map((item) => ({ id: item.id, name: item.name, email: item.email }))}
      articles={visibleArticles.map((article) => ({
        id: article.id,
        title: article.title,
        parentId: article.parentId,
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
