"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardNotFound() {
  const pathname = usePathname();

  // Extract slug from pathname: /dashboard/[slug]/...
  const slug = pathname?.split("/")?.[2] ?? "";
  const dashboardHref = slug ? `/dashboard/${slug}` : "/";

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] px-6 text-center relative">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* Compass / navigation icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <svg
            className="h-10 w-10 text-violet-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
            />
          </svg>
        </div>

        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
          Dashboard · 404
        </span>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Page Not Found
          </h1>
          <p className="max-w-sm text-[#94a3b8] text-sm leading-relaxed">
            This page doesn&apos;t exist in your dashboard. The route may have
            been removed or the URL is incorrect.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href={dashboardHref}
            className="inline-flex items-center gap-2 justify-center rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:bg-violet-500"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
              />
            </svg>
            Back to Dashboard
          </Link>
          <Link
            href={`/dashboard/${slug}/support`}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
          >
            Get Help
          </Link>
        </div>
      </div>
    </div>
  );
}
