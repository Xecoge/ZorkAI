import Link from "next/link";
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chats } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export default async function LibraryPage() {
  const user = await getSessionUser();
  const rows = user
    ? await db
        .select()
        .from(chats)
        .where(and(eq(chats.userId, user.id), eq(chats.private, 0)))
        .orderBy(desc(chats.updatedAt))
        .limit(60)
    : [];

  return (
    <div className="max-w-[764px] mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[26px] font-semibold tracking-tight">Library</h1>
        <Link
          href="/app"
          className="h-9 px-4 inline-flex items-center rounded-full border border-line text-[13px] font-medium hover:bg-hover transition-colors"
        >
          Start a new chat
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-16 text-center">
          <p className="text-[15px] font-medium">Your library is empty</p>
          <p className="mt-1 text-[13px] text-tertiary">Chats you start will collect here.</p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/app/chat/${c.id}`}
                className="flex items-center gap-3 py-3.5 border-b border-line hover:bg-hover px-3 -mx-3 rounded-xl transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary shrink-0" />
                <span className="flex-1 min-w-0 truncate text-[14px]">{c.title}</span>
                <span className="text-[12px] text-tertiary capitalize shrink-0">{c.mode}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
