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
      include: { permissions: true, articles: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  // A project is visible if: PUBLIC, or user is owner, or user has a ProjectPermission
  const visibleProjects = allProjects
    .filter((project) => {
      if (project.visibility === "PUBLIC") return true;
      if (project.authorId === user.id) return true;
      return project.permissions.some((p) => p.userId === user.id);
    })
    .map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      imageUrl: project.imageUrl,
      visibility: project.visibility,
      authorId: project.authorId,
      articleCount: project.articles.length,
      memberIds: project.permissions.map((p) => p.userId),
    }));

  return (
    <ProjectGrid
      currentUser={{ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }}
      projects={visibleProjects}
      allUsers={users.map((u) => ({ id: u.id, name: u.name, email: u.email }))}
    />
  );
}
