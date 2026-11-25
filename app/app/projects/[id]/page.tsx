import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { chats, projects } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();
  const project = db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, user.id))).get();
  if (!project) notFound();
  const chatRows = db
    .select()
    .from(chats)
    .where(and(eq(chats.userId, user.id), eq(chats.projectId, id)))
    .orderBy(desc(chats.updatedAt))
    .all();

  const ago = (ts: number) => {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  };

  return (
    <div className="max-w-[764px] mx-auto px-4 py-16">
      <p className="text-[13px] text-tertiary mb-1">
        <Link href="/app/projects" className="hover:underline">Projects</Link> / {project.name}
      </p>
      <h1 className="text-[26px] font-semibold tracking-tight mb-2">{project.name}</h1>
      {project.instructions && <p className="text-[14px] text-secondary mb-6">{project.instructions}</p>}

      <div className="flex gap-1 border-b border-line mb-4 text-[14px]" role="tablist" aria-label="Project sections">
        {["Suggested", "Recent", "Instructions", "Files"].map((t, i) => (
          <span
            key={t}
            className={`px-3 py-2 ${i === 1 ? "text-text font-medium border-b-2 border-text -mb-px" : "text-tertiary"}`}
          >
            {t}
          </span>
        ))}
      </div>

      {chatRows.length === 0 ? (
        <p className="py-10 text-center text-[14px] text-tertiary">No chats in this project yet.</p>
      ) : (
        <ul className="flex flex-col">
          {chatRows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/app/chat/${c.id}`}
                className="flex items-center gap-3 py-3.5 border-b border-line hover:bg-hover px-3 -mx-3 rounded-xl transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary shrink-0" />
                <span className="flex-1 min-w-0 truncate text-[14px]">{c.title}</span>
                <span className="text-[13px] text-tertiary shrink-0">{ago(c.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
