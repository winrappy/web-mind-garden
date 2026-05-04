"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { Leaf } from "lucide-react";

type TabMode = "google" | "web";
type WebSubMode = "login" | "register";

export function AuthView() {
  const [tab, setTab] = useState<TabMode>("google");
  const [subMode, setSubMode] = useState<WebSubMode>("login");
  const [error, setError] = useState("");
  const [avatarData, setAvatarData] = useState("");

  function switchTab(next: TabMode) {
    setTab(next);
    setError("");
  }

  function switchSubMode(next: WebSubMode) {
    setSubMode(next);
    setError("");
    if (next === "login") setAvatarData("");
  }

  async function onAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarData("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file for profile photo.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Profile photo must be smaller than 2MB.");
      event.target.value = "";
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setAvatarData(dataUrl);
  }

  async function submitWeb(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    form.set("mode", subMode);
    if (subMode === "register" && avatarData) form.set("avatarData", avatarData);
    const response = await fetch("/api/auth/manual", { method: "POST", body: form });
    if (response.ok) {
      window.location.href = "/";
      return;
    }
    const body = await response.json().catch(() => ({ error: "Something went wrong" }));
    setError(body.error || "Something went wrong");
  }

  return (
    <main className="login-wrap">
      {/* ── Left hero panel ── */}
      <section className="login-hero">
        <div className="login-hero-inner">
          <div className="login-brand">
            <div className="login-brand-mark">
              <Leaf size={22} strokeWidth={1.8} />
            </div>
            <span className="login-brand-name">Mind Garden</span>
          </div>

          <div className="login-hero-copy">
            <h2>A place for<br />your ideas to<br />grow.</h2>
            <p>Nested articles, rich editor, and per-page permissions — all in one beautiful workspace.</p>
          </div>

          <div className="login-hero-dots" aria-hidden>
            <span /><span /><span />
          </div>
        </div>
      </section>

      {/* ── Right form panel ── */}
      <section className="login-panel">
        <div className="login-card">
          <div className="login-card-header">
            <h3>{tab === "web" && subMode === "register" ? "Create account" : "Welcome back"}</h3>
            <p>{tab === "web" && subMode === "register" ? "Fill in the details below to get started." : "Sign in to continue to your garden."}</p>
          </div>

          <div className="login-tabs">
            <button
              className={`login-tab ${tab === "google" ? "active" : ""}`}
              onClick={() => switchTab("google")}
            >
              Google
            </button>
            <button
              className={`login-tab ${tab === "web" ? "active" : ""}`}
              onClick={() => switchTab("web")}
            >
              Web Account
            </button>
          </div>

          {tab === "google" ? (
            <>
              <div className="login-google-wrap">
                <a className="btn login-google-btn" href="/api/auth/google">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </a>
              </div>
              <p className="login-hint">Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.</p>
            </>
          ) : (
            <>
              <form className="login-form" onSubmit={submitWeb}>
                <label className="login-field">
                  <span>Email</span>
                  <input className="login-input" name="email" type="email" placeholder="you@example.com" required />
                </label>
                <label className="login-field">
                  <span>Password</span>
                  <input className="login-input" name="password" type="password" placeholder="••••••••" required />
                </label>
                {subMode === "register" && (
                  <label className="login-field">
                    <span>Profile photo</span>
                    <input className="login-input" type="file" accept="image/*" onChange={onAvatarChange} />
                    {avatarData ? <img className="login-avatar-preview" src={avatarData} alt="Profile preview" /> : null}
                  </label>
                )}
                <button className="btn login-submit-btn" type="submit">
                  {subMode === "login" ? "Sign in" : "Create account"}
                </button>
              </form>

              {error ? <p className="login-error">{error}</p> : null}

              <p className="login-hint">
                {subMode === "login" ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button className="login-switch-btn" type="button" onClick={() => switchSubMode("register")}>
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button className="login-switch-btn" type="button" onClick={() => switchSubMode("login")}>
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}
