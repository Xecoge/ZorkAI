"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { Mail, Chrome, Apple, Github } from "lucide-react";

function XLogo({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const PROVIDERS = [
  { id: "google", label: "Google", Icon: null },
  { id: "x", label: "X", Icon: null },
  { id: "apple", label: "Apple" },
  { id: "github", label: "GitHub" },
  { id: "email", label: "email" },
];

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isUp = mode === "sign-up";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: isUp ? "register" : "login", email, password, name }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong. Try again.");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-white dark:bg-[#1a1a1a] flex flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="inline-block" aria-label="Home">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </Link>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-24">
        <h1 className="text-[26px] font-semibold tracking-tight text-text mb-3">
          {isUp ? "Create your account" : "Log into your account"}
        </h1>
        <p className="text-[14px] text-tertiary text-center max-w-[380px] mb-8">
          By continuing, you agree to our Terms of Service, Privacy Policy, and Cookie Policy.
        </p>

        <form onSubmit={submit} className="w-full max-w-[400px] flex flex-col gap-3">
          {isUp && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              autoComplete="name"
              className="h-[52px] px-4 rounded-full border border-line bg-transparent text-[15px] outline-none focus:border-accent transition-colors"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isUp ? "Email" : "Email or username"}
            autoComplete="email"
            className="h-[52px] px-4 rounded-full border border-line bg-transparent text-[15px] outline-none focus:border-accent transition-colors"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={isUp ? "new-password" : "current-password"}
            className="h-[52px] px-4 rounded-full border border-line bg-transparent text-[15px] outline-none focus:border-accent transition-colors"
          />
          {error && (
            <p role="alert" className="text-[13px] text-danger px-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="h-[52px] rounded-full bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] text-[15px] font-semibold hover:opacity-85 disabled:opacity-50 transition-opacity"
          >
            {busy ? "One moment…" : isUp ? "Sign up" : "Log in"}
          </button>
        </form>

        <div className="w-full max-w-[400px] mt-5 flex items-center gap-3 text-[13px] text-tertiary">
          <span className="flex-1 h-px bg-line" /> or <span className="flex-1 h-px bg-line" />
        </div>

        <div className="w-full max-w-[400px] mt-5 flex flex-col gap-3">
          <SSO label={isUp ? "Continue with Google" : "Login with Google"} glyph={<GoogleG />} />
          <SSO label={isUp ? "Continue with X" : "Login with X"} glyph={<XLogo className="w-5 h-5" />} />
          <SSO label={isUp ? "Continue with Apple" : "Login with Apple"} glyph={<Apple className="w-5 h-5" />} />
          <SSO label={isUp ? "Continue with GitHub" : "Login with GitHub"} glyph={<Github className="w-5 h-5" />} />
        </div>

        <p className="mt-8 text-[14px] text-secondary">
          {isUp ? "Already have an account? " : "Don't have an account? "}
          <Link href={isUp ? "/sign-in" : "/sign-up"} className="font-medium text-text hover:underline">
            {isUp ? "Log in" : "Sign up"}
          </Link>
        </p>
        {!isUp && (
          <p className="mt-3 text-[12px] text-tertiary px-6 text-center">
            Demo account: demo@demo.ai · demo1234
          </p>
        )}
      </main>
    </div>
  );
}

function SSO({ label, glyph }: { label: string; glyph: React.ReactNode }) {
  return (
    <button
      type="button"
      title="Single sign-on is not enabled on this deployment"
      className="h-[50px] px-4 rounded-full border border-line bg-bg flex items-center justify-center gap-2 text-[15px] font-medium hover:bg-hover transition-colors cursor-pointer"
    >
      {glyph}
      {label}
    </button>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.7-.2-2.5H12v4.8h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.2-2.1 3.5-5.2 3.5-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1C3.3 21.3 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8L20 3.1C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}
