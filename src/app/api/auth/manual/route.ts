import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Provider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const name = String(form.get("name") || email.split("@")[0] || "Writer").trim();
  const password = String(form.get("password") || "");

  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    const ok = await bcrypt.compare(password, existing.passwordHash);
    if (!ok) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    await createSession(existing.id);
    return NextResponse.json({ ok: true });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { provider: Provider.MANUAL, passwordHash },
      })
    : await prisma.user.create({
        data: {
          email,
          name,
          provider: Provider.MANUAL,
          passwordHash,
        },
      });

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
