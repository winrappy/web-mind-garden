import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Provider } from "@prisma/client";
import { appUrl, createSession, verifyState } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type GoogleTokenResponse = {
  access_token: string;
};

type GoogleProfile = {
  email: string;
  name?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const signedState = cookieStore.get("google_oauth_state")?.value || null;

  if (!code || !verifyState(signedState, state || "")) redirect("/?error=invalid-google-state");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: appUrl("/api/auth/google/callback"),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) redirect("/?error=google-token-failed");
  const token = (await tokenResponse.json()) as GoogleTokenResponse;

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) redirect("/?error=google-profile-failed");

  const profile = (await profileResponse.json()) as GoogleProfile;
  const user = await prisma.user.upsert({
    where: { email: profile.email.toLowerCase() },
    update: { name: profile.name || profile.email },
    create: {
      email: profile.email.toLowerCase(),
      name: profile.name || profile.email,
      provider: Provider.GOOGLE,
    },
  });

  cookieStore.delete("google_oauth_state");
  await createSession(user.id);
  redirect("/");
}
