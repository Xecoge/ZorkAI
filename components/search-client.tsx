"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

export function SearchClient() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ chats: { id: string; title: string }[]; messages: { id: string; chatId: string; content: string }[]; projects: { id: string; name: string }[] }>({ chats: [], messages: [], projects: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults({ chats: [], messages: [], projects: [] }); return; }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => { setResults(d); setLoading(false); })
        .catch(() => setLoading(false));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const total = results.chats.length + results.messages.length + results.projects.length;

  return (
    <div className="max-w-[764px] mx-auto px-4 py-16">
      <h1 className="text-[26px] font-semibold tracking-tight mb-6">Search</h1>
      <div className="flex items-center gap-2 h-[52px] rounded-full border border-line bg-pane px-5 shadow-card focus-within:shadow-pop transition-shadow mb-6">
        <Search className="w-[17px] h-[17px] text-tertiary" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search chats, messages and projects..."
          aria-label="Search query"
          className="flex-1 bg-transparent outline-none text-[15px] min-w-0"
        />
      </div>
      {loading && <p className="text-[13px] text-tertiary">Searching…</p>}
      {!loading && q.trim() && total === 0 && (
        <p className="py-10 text-center text-[14px] text-tertiary">No results for “{q}”.</p>
      )}
      {!q.trim() && <p className="py-10 text-center text-[14px] text-tertiary">Search across your entire history.</p>}
      {results.chats.map((c) => (
        <Link key={c.id} href={`/app/chat/${c.id}`} className="block px-4 py-3.5 rounded-2xl hover:bg-hover transition-colors">
          <p className="text-[14px] font-medium truncate">{c.title}</p>
          <p className="text-[12px] text-tertiary">Chat</p>
        </Link>
      ))}
      {results.projects.map((p) => (
        <Link key={p.id} href={`/app/projects/${p.id}`} className="block px-4 py-3.5 rounded-2xl hover:bg-hover transition-colors">
          <p className="text-[14px] font-medium truncate">{p.name}</p>
          <p className="text-[12px] text-tertiary">Project</p>
        </Link>
      ))}
      {results.messages.map((m) => (
        <Link key={m.id} href={`/app/chat/${m.chatId}`} className="block px-4 py-3.5 rounded-2xl hover:bg-hover transition-colors">
          <p className="text-[14px] text-secondary line-clamp-2">{m.content.slice(0, 140)}</p>
          <p className="text-[12px] text-tertiary">Message</p>
        </Link>
      ))}
    </div>
  );
}
