"use client";

import { useState } from "react";

export function AuthView() {
  const [mode, setMode] = useState<"google" | "manual">("google");
  const [error, setError] = useState("");

  async function submitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/manual", { method: "POST", body: form });
    if (response.ok) {
      window.location.href = "/";
      return;
    }
    const body = await response.json().catch(() => ({ error: "Login failed" }));
    setError(body.error || "Login failed");
  }

  return (
    <main className="login-wrap">
      <section className="login-hero">
        <div className="brand">
          <div className="brand-mark" />
          <div>
            <h1>Mind Garden</h1>
            <p>Article workspace</p>
          </div>
        </div>
        <div>
          <h2>Build a living knowledge garden</h2>
          <p>Next.js + Postgres with a high-quality editor for deeply nested articles and page-level permissions.</p>
        </div>
      </section>
      <section className="login-panel">
        <div className="panel login-card">
          <div className="tabs">
            <button className={`tab ${mode === "google" ? "active" : ""}`} onClick={() => setMode("google")}>
              Google mail
            </button>
            <button className={`tab ${mode === "manual" ? "active" : ""}`} onClick={() => setMode("manual")}>
              Manual
            </button>
          </div>

          {mode === "google" ? (
            <a className="btn primary" href="/api/auth/google">
              Sign in with Google
            </a>
          ) : (
            <form onSubmit={submitManual}>
              <label className="field">
                <span>Name</span>
                <input className="input" name="name" defaultValue="Admin Writer" />
              </label>
              <label className="field">
                <span>Email</span>
                <input className="input" name="email" type="email" defaultValue="admin@example.com" required />
              </label>
              <label className="field">
                <span>Password</span>
                <input className="input" name="password" type="password" defaultValue="admin1234" required />
              </label>
              <button className="btn primary" type="submit">
                Login / Create user
              </button>
            </form>
          )}

          {error ? <p className="hint">{error}</p> : null}
          <p className="hint">
            Manual login creates a new user when the email does not exist. Google login requires GOOGLE_CLIENT_ID and
            GOOGLE_CLIENT_SECRET in .env.
          </p>
        </div>
      </section>
    </main>
  );
}
