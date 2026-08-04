"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
export default function FestivalPublicNotFound() {
  const pathname = usePathname();
  // First URL segment is the festival slug. Layout only calls notFound() after
  // findFestivalBySlug succeeds, so this is always a real (or formerly-real)
  // festival. If it's missing, fall back to site root for both CTAs.
  const segments = (pathname ?? "").split("/").filter(Boolean);
  const festivalSlug = segments[0];
  const festivalHref = festivalSlug ? `/${festivalSlug}` : "/";
  const loginHref = festivalSlug ? `/${festivalSlug}/login` : "/login";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/3 h-[22rem] w-[30rem] -translate-x-1/2 rounded-full bg-primary/6 blur-[120px]"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        {/* Festival icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card shadow-premium">
          <svg
            className="h-10 w-10 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
            />
          </svg>
        </div>

        <span className="text-eyebrow">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Festival · Error 404
        </span>

        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-heading">
            Page not found
          </h1>
          <p className="max-w-md text-muted-foreground leading-relaxed">
            This festival page couldn&apos;t be found. The event may have ended,
            or the link might be incorrect. Please check the URL and try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href={festivalHref}
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-primary-glow transition-opacity hover:opacity-90"
          >
            Go to festival home
          </Link>
          <Link
            href={loginHref}
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Try login again
          </Link>
        </div>
      </div>
    </div>
  );
}
