import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { appUrl, signState } from "@/lib/auth";

function googleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || appUrl("/api/auth/google/callback");
}

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) redirect("/?error=missing-google-client-id");
  const callbackUrl = googleRedirectUri();

  const state = randomBytes(16).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", signState(state), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
