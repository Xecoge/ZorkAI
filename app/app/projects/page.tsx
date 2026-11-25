import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { NewProjectButton } from "@/components/projects-client";

export default async function ProjectsPage() {
  const user = await getSessionUser();
  const rows = user
    ? db.select().from(projects).where(eq(projects.userId, user.id)).orderBy(desc(projects.createdAt)).all()
    : [];

  return (
    <div className="max-w-[764px] mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[26px] font-semibold tracking-tight">Projects</h1>
        <NewProjectButton />
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-16 text-center">
          <p className="text-[15px] font-medium">No projects yet</p>
          <p className="mt-1 text-[13px] text-tertiary max-w-[360px] mx-auto">
            Group related chats with shared instructions — research, writing, planning.
          </p>
          <div className="mt-5 flex justify-center"><NewProjectButton /></div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((p) => (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-line hover:bg-hover transition-colors"
            >
              <span className="min-w-0">
                <span className="block font-medium truncate">{p.name}</span>
                <span className="block text-[13px] text-tertiary truncate">
                  {p.instructions || "No custom instructions"}
                </span>
              </span>
              <span className="text-[13px] text-tertiary shrink-0">
                {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
