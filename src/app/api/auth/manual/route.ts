import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Provider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const mode = String(form.get("mode") || "login");
  const avatarDataRaw = String(form.get("avatarData") || "").trim();
  const avatarData = avatarDataRaw.startsWith("data:image/") ? avatarDataRaw : null;

  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });

  if (mode === "login") {
    if (!existing?.passwordHash) return NextResponse.json({ error: "Account not found. Please create an account first." }, { status: 401 });
    const ok = await bcrypt.compare(password, existing.passwordHash);
    if (!ok) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    await createSession(existing.id);
    return NextResponse.json({ ok: true });
  }

  // mode === "register"
  if (existing?.passwordHash) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const name = email.split("@")[0] || "Writer";
  const passwordHash = await bcrypt.hash(password, 10);
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { provider: Provider.MANUAL, passwordHash, avatarUrl: avatarData ?? existing.avatarUrl },
      })
    : await prisma.user.create({
        data: { email, name, provider: Provider.MANUAL, passwordHash, avatarUrl: avatarData },
      });

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
