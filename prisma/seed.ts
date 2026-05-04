import { PrismaClient, Provider, PermissionRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function makeContent(heading: string, body: string) {
  return {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: heading }] },
      { type: "paragraph", content: [{ type: "text", text: body }] },
    ],
  };
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin Writer",
      email: "admin@example.com",
      provider: Provider.MANUAL,
      passwordHash: await bcrypt.hash("admin1234", 10),
    },
  });

  // Projects
  const projectDefs = [
    {
      id: "demo-project-knowledge",
      name: "Knowledge Garden",
      imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "demo-project-product",
      name: "Product Notes",
      imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "demo-project-research",
      name: "Research",
      imageUrl: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=600&q=80",
    },
  ];

  for (const def of projectDefs) {
    await prisma.project.upsert({
      where: { id: def.id },
      update: {},
      create: { id: def.id, name: def.name, imageUrl: def.imageUrl, authorId: user.id },
    });
  }

  const topicDefs = [
    {
      id: "demo-topic-knowledge-core",
      projectId: "demo-project-knowledge",
      name: "Core Notes",
      description: "Main notes for onboarding and writing guidelines.",
    },
    {
      id: "demo-topic-product-planning",
      projectId: "demo-project-product",
      name: "Planning",
      description: "Roadmap and release planning notes.",
    },
    {
      id: "demo-topic-research-overview",
      projectId: "demo-project-research",
      name: "Overview",
      description: "Research summaries and references.",
    },
  ];

  for (const def of topicDefs) {
    await prisma.topic.upsert({
      where: { id: def.id },
      update: {},
      create: def,
    });
  }

  // Articles inside Knowledge Garden
  await prisma.article.upsert({
    where: { id: "demo-root" },
    update: {},
    create: {
      id: "demo-root",
      title: "Welcome",
      projectId: "demo-project-knowledge",
      topicId: "demo-topic-knowledge-core",
      authorId: user.id,
      content: makeContent("Welcome", "Start writing your knowledge base here."),
      permissions: { create: { userId: user.id, role: PermissionRole.EDIT } },
    },
  });

  await prisma.article.upsert({
    where: { id: "demo-garden-tips" },
    update: {},
    create: {
      id: "demo-garden-tips",
      title: "Tips & Tricks",
      projectId: "demo-project-knowledge",
      topicId: "demo-topic-knowledge-core",
      parentId: "demo-root",
      authorId: user.id,
      content: makeContent("Tips & Tricks", "Useful tips for managing your knowledge garden."),
      permissions: { create: { userId: user.id, role: PermissionRole.EDIT } },
    },
  });

  // Articles inside Product Notes
  await prisma.article.upsert({
    where: { id: "demo-product-notes" },
    update: {},
    create: {
      id: "demo-product-notes",
      title: "Roadmap",
      projectId: "demo-project-product",
      topicId: "demo-topic-product-planning",
      authorId: user.id,
      content: makeContent("Roadmap", "Track upcoming features and milestones."),
      permissions: { create: { userId: user.id, role: PermissionRole.EDIT } },
    },
  });

  // Articles inside Research
  await prisma.article.upsert({
    where: { id: "demo-research-intro" },
    update: {},
    create: {
      id: "demo-research-intro",
      title: "Introduction",
      projectId: "demo-project-research",
      topicId: "demo-topic-research-overview",
      authorId: user.id,
      content: makeContent("Introduction", "Research notes and findings."),
      permissions: { create: { userId: user.id, role: PermissionRole.EDIT } },
    },
  });
}

main().finally(() => prisma.$disconnect());
