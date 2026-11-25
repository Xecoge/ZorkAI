"use client";

import { useMemo, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { renderMarkdown, type MarkdownBlockType } from "@/lib/markdown";

function MarkdownBlock({ block, wrapCode }: { block: MarkdownBlockType; wrapCode: boolean }) {
  if (block.type === "code") {
    return <CodeBlock lang={block.lang} code={block.code} wrap={wrapCode} />;
  }
  if (block.type === "heading") {
    const Tag = `h${Math.min(block.level, 4)}` as "h1" | "h2" | "h3" | "h4";
    return <Tag dangerouslySetInnerHTML={{ __html: inlineHtml(block.text) }} />;
  }
  if (block.type === "table") {
    return (
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table>
          <thead>
            <tr>{block.header.map((h, j) => <th key={j} dangerouslySetInnerHTML={{ __html: inlineHtml(h) }} />)}</tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>{row.map((c, j) => <td key={j} dangerouslySetInnerHTML={{ __html: inlineHtml(c) }} />)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "quote") return <blockquote dangerouslySetInnerHTML={{ __html: inlineHtml(block.text) }} />;
  if (block.type === "ul")
    return (
      <ul>
        {block.items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{ __html: inlineHtml(it) }} />)}
      </ul>
    );
  if (block.type === "ol")
    return (
      <ol>
        {block.items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{ __html: inlineHtml(it) }} />)}
      </ol>
    );
  return <p dangerouslySetInnerHTML={{ __html: inlineHtml(block.text) }} />;
}

function inlineHtml(s: string): string {
  // inline() lives in renderMarkdown's closure; replicate minimal inline rules here.
  const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function CodeBlock({ lang, code, wrap }: { lang: string; code: string; wrap: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-line overflow-hidden bg-pane">
      <div className="flex items-center justify-between px-4 h-9 border-b border-line">
        <span className="text-[12px] text-tertiary font-mono">{lang || "code"}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1.5 text-[12px] text-secondary hover:text-text transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={`p-4 text-[13px] leading-relaxed font-mono overflow-x-auto ${wrap ? "whitespace-pre-wrap break-words" : ""}`}>
        {code}
      </pre>
    </div>
  );
}

export function Markdown({ source, wrapCode }: { source: string; wrapCode: boolean }) {
  const blocks = useMemo(() => renderMarkdown(source), [source]);
  return (
    <div className="md">
      {blocks.map((b, i) => (
        <MarkdownBlock key={i} block={b} wrapCode={wrapCode} />
      ))}
    </div>
  );
}
