import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh grid place-items-center bg-pane px-4">
      <div className="text-center">
        <p className="text-[15px] font-medium">This page or chat doesn&apos;t exist.</p>
        <p className="mt-1 text-[13px] text-tertiary">It may have been deleted, or the link is wrong.</p>
        <Link
          href="/app"
          className="mt-5 inline-flex h-10 items-center rounded-full bg-accent px-5 text-[14px] font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
