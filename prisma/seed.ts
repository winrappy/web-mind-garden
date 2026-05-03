import { PrismaClient, Provider, PermissionRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const content = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Knowledge Garden" }] },
    {
      type: "paragraph",
      content: [{ type: "text", text: "A rich editor workspace for nested articles with page-level access control." }],
    },
  ],
};

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

  const root = await prisma.article.upsert({
    where: { id: "demo-root" },
    update: {},
    create: {
      id: "demo-root",
      title: "Knowledge Garden",
      authorId: user.id,
      content,
      permissions: { create: { userId: user.id, role: PermissionRole.EDIT } },
    },
  });

  await prisma.article.upsert({
    where: { id: "demo-product-notes" },
    update: {},
    create: {
      id: "demo-product-notes",
      title: "Product Notes",
      parentId: root.id,
      authorId: user.id,
      content,
      permissions: { create: { userId: user.id, role: PermissionRole.EDIT } },
    },
  });
}

main().finally(() => prisma.$disconnect());
