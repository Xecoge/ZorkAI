"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Settings, ArrowUp, Plus, Image as ImageIcon, PenLine, Globe } from "lucide-react";
import { ZorkLogo } from "@/components/zork-logo";
import { PrivacyFooter, FooterLink } from "@/components/privacy-footer";

const SUGGESTIONS = [
  { icon: ImageIcon, label: "Create an image" },
  { icon: PenLine, label: "Write or edit" },
  { icon: Globe, label: "Search the web" },
];

export function LandingHome() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function send(text?: string) {
    const value = (text ?? prompt).trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      // Sample the demo account so the first prompt works without a detour.
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: "demo@demo.ai", password: "demo1234" }),
      });
      if (!res.ok) {
        router.push("/sign-in");
        return;
      }
      const created = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fast" }),
      }).then((r) => r.json());
      router.push(`/app/chat/${created.chat.id}?q=${encodeURIComponent(value)}`);
    } catch {
      router.push("/sign-in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dark min-h-dvh bg-pane text-text flex flex-col">
      <header className="relative z-10 flex items-center justify-between px-5 py-4">
        <ZorkLogo height={36} />
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            aria-label="Sign in to manage settings"
            title="Sign in to manage settings"
            className="w-10 h-10 grid place-items-center rounded-full hover:bg-hover transition-colors text-secondary"
          >
            <Settings className="w-[18px] h-[18px]" />
          </Link>
          <Link
            href="/sign-in"
            className="h-9 px-4 inline-flex items-center rounded-full border border-line bg-bg text-[14px] font-medium hover:bg-hover transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="h-9 px-4 inline-flex items-center rounded-full bg-[#1a1a1a] text-white dark:bg-white dark:text-[#1a1a1a] text-[14px] font-medium hover:opacity-85 transition-opacity"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-center text-text mb-8">
          What&apos;s on the agenda today?
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="w-full max-w-[756px]"
        >
          <div className="flex items-center gap-2 h-[60px] rounded-full bg-bg border border-line shadow-card pl-3 pr-3 focus-within:shadow-pop transition-shadow">
            <button
              type="button"
              aria-label="Add attachment"
              onClick={() => setNotice("Attachments need a storage provider on this deployment.")}
              className="w-10 h-10 shrink-0 grid place-items-center rounded-full bg-pane text-secondary hover:bg-hover transition-colors"
            >
              <Plus className="w-[18px] h-[18px]" />
            </button>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask, create images, or build anything..."
              aria-label="Ask anything"
              className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-tertiary min-w-0"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || busy}
              aria-label="Send"
              className="w-10 h-10 shrink-0 grid place-items-center rounded-full text-tertiary hover:bg-hover disabled:opacity-40 transition-colors"
            >
              <ArrowUp className="w-[18px] h-[18px]" />
            </button>
          </div>
          {notice && (
            <p role="status" className="mt-2 px-4 text-[13px] text-secondary text-center">
              {notice}
            </p>
          )}
        </form>

        <div className="w-full max-w-[756px] mt-3 flex flex-col gap-1">
          {SUGGESTIONS.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => send(label === "Create an image" ? "A calm isometric illustration of a tidy workspace" : label)}
              className="flex items-center gap-3 h-11 px-3 -ml-3 rounded-2xl text-left text-[15px] text-secondary hover:bg-hover transition-colors"
            >
              <Icon className="w-[18px] h-[18px] text-secondary" />
              {label}
            </button>
          ))}
        </div>
      </main>

      <footer className="pb-6 text-center text-[13px] text-secondary">
        <p>
          By messaging Zork, you agree to our{" "}
          <FooterLink href="/terms">Terms of Service</FooterLink> and{" "}
          <FooterLink href="/privacy">Privacy Policy</FooterLink>.
        </p>
        <PrivacyFooter />
      </footer>
    </div>
  );
}
