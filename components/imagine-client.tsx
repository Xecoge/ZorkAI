"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowUp } from "lucide-react";

export function ImagineClient() {
  const [prompt, setPrompt] = useState("");
  const [items, setItems] = useState<{ id: string; prompt: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/imagine").then((r) => r.json()).then((d) => setItems(d.generations || [])).catch(() => {});
  }, []);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/imagine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error || "Generation failed."); return; }
    setItems((prev) => [data.generation, ...prev]);
    setPrompt("");
  }

  return (
    <div className="max-w-[764px] mx-auto px-4 py-16">
      <h1 className="text-[26px] font-semibold tracking-tight mb-1">Imagine</h1>
      <p className="text-[13px] text-tertiary mb-8">
        Preview renderings while no image provider is connected — every prompt is saved to your library.
      </p>
      <form onSubmit={generate} className="flex items-center gap-2 h-[56px] rounded-full border border-line bg-pane pl-5 pr-2 shadow-card focus-within:shadow-pop transition-shadow mb-8">
        <Sparkles className="w-[18px] h-[18px] text-tertiary shrink-0" />
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe an image to create..."
          aria-label="Image prompt"
          className="flex-1 bg-transparent outline-none text-[15px] min-w-0"
        />
        <button
          disabled={busy || !prompt.trim()}
          aria-label="Generate"
          className="w-10 h-10 grid place-items-center rounded-full bg-accent text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
        >
          <ArrowUp className="w-[18px] h-[18px]" />
        </button>
      </form>
      {error && <p role="alert" className="text-[13px] text-danger mb-4">{error}</p>}
      {items.length === 0 && !busy ? (
        <p className="py-12 text-center text-[14px] text-tertiary">Nothing generated yet. Try “a calm isometric workspace”.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((g) => (
            <figure key={g.id} className="rounded-2xl overflow-hidden border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/imagine/preview/${g.id}?p=${encodeURIComponent(g.prompt.slice(0, 80))}`}
                alt={`Preview art for: ${g.prompt}`}
                width={400}
                height={400}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              <figcaption className="p-2.5 text-[12px] text-secondary truncate">{g.prompt}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
