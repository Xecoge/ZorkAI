"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Copy, Check, ThumbsUp, ThumbsDown, RefreshCw, MoreHorizontal, BarChart3, X, PanelRight, Info } from "lucide-react";
import { Composer } from "./composer";
import { Markdown } from "./markdown";
import { useShell, refreshChats } from "./app-shell";

const FOLLOW_UPS = ["Analyze this in more depth", "Give me a concrete example", "Make it shorter", "What are the risks?"];

type Msg = { id: string; role: string; content: string; createdAt?: number; sources?: number | null; thinking?: boolean };

export function ChatView({ chat, initialMessages }: { chat: { id: string; title: string; mode: string; private: number }; initialMessages: Msg[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(chat.mode);
  const { settings, openSearch } = useShell();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const sentInitial = useRef(false);

  const send = useCallback(async (content: string, { regenerate = false }: { regenerate?: boolean } = {}) => {
    setError("");
    setBusy(true);
    if (!regenerate) {
      setMessages((m) => [...m, { id: `tmp_u_${Date.now()}`, role: "user", content, createdAt: Date.now() }]);
    } else {
      setMessages((m) => {
        const copy = [...m];
        while (copy.length && copy[copy.length - 1].role === "assistant") copy.pop();
        return copy;
      });
    }
    setMessages((m) => [...m, { id: "thinking", role: "assistant", content: "", thinking: true }]);
    try {
      const res = await fetch(`/api/chats/${chat.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, regenerate, mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMessages((m) => [...m.filter((x) => x.id !== "thinking"), data.message]);
      refreshChats();
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== "thinking"));
      setError((e instanceof Error ? e.message : "") || "The reply failed to load. Try again.");
    } finally {
      setBusy(false);
    }
  }, [chat.id, mode]);

  // A prompt handed over from the logged-out landing page.
  useEffect(() => {
    const q = searchParams?.get("q");
    if (q && !sentInitial.current && initialMessages.length === 0) {
      sentInitial.current = true;
      router.replace(`/app/chat/${chat.id}`);
      send(q);
    }
  }, [searchParams, chat.id, initialMessages.length, send, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <TopBar title={chat.title} privateFlag={chat.private} onSearch={openSearch} />

      {empty ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <h1 className="text-[28px] font-semibold tracking-tight mb-7 text-center">What&apos;s on the agenda today?</h1>
          <Composer onSend={(v) => send(v)} busy={busy} mode={mode} setMode={setMode} />
          {!!settings.showSuggestions ? (
            <div className="w-full max-w-[756px] mt-3 flex flex-col gap-1">
              {["Create an image", "Write or edit", "Search the web"].map((label) => (
                <button key={label} onClick={() => send(label)} className="flex items-center gap-3 h-11 px-3 -ml-3 rounded-2xl text-left text-[15px] text-secondary hover:bg-hover transition-colors">
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[764px] mx-auto px-4 pt-6 pb-40 flex flex-col gap-7">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-[22px] bg-pane border border-line px-4 py-2.5 text-[15px] whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              ) : (
                <AssistantMessage key={m.id} message={m} onRegenerate={() => send("", { regenerate: true })} wrapCode={!!settings.wrapCode} />
              ),
            )}
            {error && (
              <div className="rounded-2xl border border-line bg-pane px-4 py-3 text-[13px] text-danger flex items-center justify-between gap-3">
                {error}
                <button onClick={() => setError("")} aria-label="Dismiss error" className="w-9 h-9 -mr-2 grid place-items-center rounded-full hover:bg-hover"><X className="w-4 h-4" /></button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {!empty && (
        <div className="absolute bottom-0 inset-x-0 pb-4 pt-8 bg-gradient-to-t from-bg via-bg/95 to-transparent pointer-events-none">
          <div className="max-w-[764px] mx-auto px-4 pointer-events-auto">
            <Composer onSend={(v) => send(v)} busy={busy} mode={mode} setMode={setMode} />
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar({ title, privateFlag, onSearch }: { title: string; privateFlag: number; onSearch: () => void }) {
  return (
    <div className="absolute top-3 right-4 z-20 flex items-center gap-1.5 md:right-5">
      {privateFlag ? (
        <span className="h-8 px-3 inline-flex items-center gap-1.5 rounded-full border border-line text-[13px] text-secondary bg-bg">
          <Info className="w-3.5 h-3.5" /> Private
        </span>
      ) : null}
      <button onClick={onSearch} aria-label="Search" className="w-9 h-9 grid place-items-center rounded-full hover:bg-hover text-secondary transition-colors">
        <PanelRight className="w-[17px] h-[17px]" />
      </button>
    </div>
  );
}

function AssistantMessage({ message, onRegenerate, wrapCode }: { message: Msg; onRegenerate: () => void; wrapCode: boolean }) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (message.thinking) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-secondary rise-in">
        <span className="flex gap-1">
          <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
          <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
          <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
        </span>
        Working…
      </div>
    );
  }

  return (
    <div className="rise-in">
      <Markdown source={message.content} wrapCode={wrapCode} />
      <div className="mt-3 flex items-center gap-0.5 text-secondary">
        {message.sources ? (
          <Link href="/app/search" className="mr-2 h-7 px-2 inline-flex items-center gap-1.5 rounded-full border border-line text-[12px] hover:bg-hover transition-colors">
            <BarChart3 className="w-3.5 h-3.5" />
            {message.sources} sources
          </Link>
        ) : null}
        <ActionBtn
          label={copied ? "Copied" : "Copy"}
          onClick={() => {
            if (navigator.clipboard) navigator.clipboard.writeText(message.content).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </ActionBtn>
        <ActionBtn label="Good response" active={vote === "up"} onClick={() => setVote(vote === "up" ? null : "up")}>
          <ThumbsUp className="w-4 h-4" />
        </ActionBtn>
        <ActionBtn label="Bad response" active={vote === "down"} onClick={() => setVote(vote === "down" ? null : "down")}>
          <ThumbsDown className="w-4 h-4" />
        </ActionBtn>
        <ActionBtn label="Regenerate" onClick={onRegenerate}>
          <RefreshCw className="w-4 h-4" />
        </ActionBtn>
        <ActionBtn label="More" onClick={() => setFeedbackOpen((v) => !v)}>
          <MoreHorizontal className="w-4 h-4" />
        </ActionBtn>
      </div>
      {feedbackOpen && (
        <div className="mt-2 text-[12px] text-tertiary">
          Thanks — feedback on this reply is recorded locally in this demo deployment.
        </div>
      )}
    </div>
  );
}

function ActionBtn({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-9 h-9 grid place-items-center rounded-full hover:bg-hover transition-colors ${active ? "text-accent" : ""}`}
    >
      {children}
    </button>
  );
}

export function NewChatHome() {
  const [mode, setMode] = useState("fast");
  const [busy, setBusy] = useState(false);
  const { settings } = useShell();
  const router = useRouter();

  async function send(text: string) {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    router.push(`/app/chat/${data.chat.id}?q=${encodeURIComponent(text)}`);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24">
      <h1 className="text-[28px] font-semibold tracking-tight mb-7 text-center">What&apos;s on the agenda today?</h1>
      <Composer onSend={send} busy={busy} mode={mode} setMode={setMode} />
      {!!settings.showSuggestions && (
        <div className="w-full max-w-[756px] mt-3 flex flex-col gap-1">
          {[
            { icon: "🖼", label: "Create an image" },
            { icon: "✏️", label: "Write or edit" },
            { icon: "🌐", label: "Search the web" },
          ].map(({ label }) => (
            <button
              key={label}
              onClick={() => send(label)}
              className="flex items-center gap-3 h-11 px-3 -ml-3 rounded-2xl text-left text-[15px] text-secondary hover:bg-hover transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
