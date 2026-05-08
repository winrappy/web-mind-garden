import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthView } from "@/components/auth-view";
import { ProjectGrid } from "@/components/project-grid";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <AuthView />;

  const [allProjects, users] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "asc" },
      include: { permissions: true, _count: { select: { articles: true } } },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
  ]);

  const visibleProjects = allProjects.map((project) => {
    const isOwner = project.authorId === user.id;
    const accessible =
      project.visibility === "PUBLIC" ||
      isOwner ||
      project.permissions.some((p) => {
        if (p.userId !== user.id) return false;
        const role = String(p.role);
        return role === "VIEW" || role === "EDIT" || role === "ADMIN";
      });
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      imageUrl: project.imageUrl,
      visibility: project.visibility,
      authorId: project.authorId,
      articleCount: project._count.articles,
      memberPermissions: project.permissions.map((p) => ({ userId: p.userId, role: String(p.role) })),
      accessible,
    };
  });

  return (
    <ProjectGrid
      currentUser={{ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }}
      projects={visibleProjects}
      allUsers={users}
    />
  );
}
