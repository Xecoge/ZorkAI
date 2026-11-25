import Link from "next/link";

/* Line-art ghost glyph in the same thin-stroke style as the reference mark:
   a rounded outline with a wavy bottom and two dot eyes. */
export function ZorkLogo({
  height = 28,
  className = "",
  href = "/",
}: {
  height?: number;
  className?: string;
  href?: string | null;
}) {
  const glyph = (
    <svg
      width={height}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M7 27 V15 a9 9 0 0 1 18 0 v12 q-2.25 -4.5 -4.5 0 t-4.5 0 t-4.5 0 t-4.5 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12.7" cy="15" r="1.5" fill="currentColor" />
      <circle cx="19.3" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
  const inner = (
    <span
      className={`inline-flex items-center justify-center text-black dark:text-white ${className}`}
      style={{ height }}
    >
      {glyph}
    </span>
  );
  if (!href) return inner;
  return (
    <Link href={href} aria-label="Zork home" className="inline-flex transition-opacity hover:opacity-80">
      {inner}
    </Link>
  );
}
