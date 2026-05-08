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

function makeApiSpecContent() {
  return {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "example API" }] },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "API specification for creating a transit order with pickup, drop-off, pricing, and audit tracking." },
        ],
      },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Endpoint overview" }] },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Item" }] }] },
              { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Value" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Method" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "POST" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Endpoint" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "/api/v1/transit-orders" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Authentication" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Bearer token" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Content-Type" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "application/json" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Success code" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "201 Created" }] }] },
            ],
          },
        ],
      },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Request" }] },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Field" }] }],
              },
              {
                type: "tableHeader",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Type" }] }],
              },
              {
                type: "tableHeader",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Required" }] }],
              },
              {
                type: "tableHeader",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Example" }] }],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Method" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "string" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Yes" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "POST" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "customerId" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "string" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Yes" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "CUS-1001" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "pickupLocation" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "string" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Yes" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Bang Sue Terminal" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "dropoffLocation" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "string" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Yes" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Chiang Mai Hub" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "scheduledAt" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "datetime" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Yes" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "2026-05-18T09:30:00Z" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "serviceLevel" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "enum" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Yes" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "EXPRESS" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "packageCount" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "number" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "No" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "3" }] }] },
            ],
          },
        ],
      },
      {
        type: "codeBlock",
        content: [
          {
            type: "text",
            text: "{\n  \"customerId\": \"CUS-1001\",\n  \"pickupLocation\": \"Bang Sue Terminal\",\n  \"dropoffLocation\": \"Chiang Mai Hub\",\n  \"scheduledAt\": \"2026-05-18T09:30:00Z\",\n  \"serviceLevel\": \"EXPRESS\",\n  \"packageCount\": 3,\n  \"notes\": \"Handle with care\"\n}",
          },
        ],
      },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Response" }] },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Field" }] }],
              },
              {
                type: "tableHeader",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Type" }] }],
              },
              {
                type: "tableHeader",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Meaning" }] }],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Status" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "string" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "201 Created" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "id" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "string" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "TRN-20260518-0001" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "status" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "enum" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "PENDING_PICKUP" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "price" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "number" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "1250" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "currency" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "string" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "THB" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "pickupEta" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "datetime" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "2026-05-18T10:00:00Z" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "createdAt" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "datetime" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "2026-05-15T07:12:44Z" }] }] },
            ],
          },
        ],
      },
      {
        type: "codeBlock",
        content: [
          {
            type: "text",
            text: "{\n  \"id\": \"TRN-20260518-0001\",\n  \"status\": \"PENDING_PICKUP\",\n  \"customerId\": \"CUS-1001\",\n  \"pickupLocation\": \"Bang Sue Terminal\",\n  \"dropoffLocation\": \"Chiang Mai Hub\",\n  \"scheduledAt\": \"2026-05-18T09:30:00Z\",\n  \"serviceLevel\": \"EXPRESS\",\n  \"price\": 1250,\n  \"currency\": \"THB\",\n  \"pickupEta\": \"2026-05-18T10:00:00Z\",\n  \"createdAt\": \"2026-05-15T07:12:44Z\"\n}",
          },
        ],
      },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Sequence Diagram" }] },
      {
        type: "codeBlock",
        content: [
          {
            type: "text",
            text: "sequenceDiagram\n  autonumber\n  participant C as Client App\n  participant API as Transit API\n  participant Pricing as Pricing Service\n  participant DB as Postgres\n\n  C->>API: POST /api/v1/transit-orders\n  API->>API: Validate payload\n  API->>Pricing: Calculate route price\n  Pricing-->>API: price = 1250 THB\n  API->>DB: INSERT transit order\n  API->>DB: INSERT order event CREATED\n  DB-->>API: order id + timestamps\n  API-->>C: 201 Created + response payload",
          },
        ],
      },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "SQL" }] },
      {
        type: "codeBlock",
        content: [
          {
            type: "text",
            text: "INSERT INTO transit_orders (\n  id,\n  customer_id,\n  pickup_location,\n  dropoff_location,\n  scheduled_at,\n  service_level,\n  package_count,\n  price_amount,\n  price_currency,\n  status,\n  created_at\n) VALUES (\n  'TRN-20260518-0001',\n  'CUS-1001',\n  'Bang Sue Terminal',\n  'Chiang Mai Hub',\n  '2026-05-18 09:30:00+00',\n  'EXPRESS',\n  3,\n  1250,\n  'THB',\n  'PENDING_PICKUP',\n  NOW()\n);\n\nINSERT INTO transit_order_events (order_id, event_type, event_payload, created_at)\nVALUES (\n  'TRN-20260518-0001',\n  'CREATED',\n  '{\"source\":\"api\",\"actor\":\"system\"}',\n  NOW()\n);",
          },
        ],
      },
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

  // Requested sample: at-transsit -> API -> example API
  await prisma.project.upsert({
    where: { id: "at-transsit" },
    update: {},
    create: {
      id: "at-transsit",
      name: "at-transsit",
      description: "Transit API specifications and implementation notes.",
      authorId: user.id,
    },
  });

  await prisma.topic.upsert({
    where: { id: "at-transsit-topic-api" },
    update: {},
    create: {
      id: "at-transsit-topic-api",
      projectId: "at-transsit",
      name: "API",
      description: "API endpoint specifications.",
    },
  });

  await prisma.article.upsert({
    where: { id: "at-transsit-article-example-api" },
    update: {
      title: "example API",
      projectId: "at-transsit",
      topicId: "at-transsit-topic-api",
      content: makeApiSpecContent(),
    },
    create: {
      id: "at-transsit-article-example-api",
      title: "example API",
      projectId: "at-transsit",
      topicId: "at-transsit-topic-api",
      authorId: user.id,
      content: makeApiSpecContent(),
      permissions: { create: { userId: user.id, role: PermissionRole.EDIT } },
    },
  });
}

main().finally(() => prisma.$disconnect());
