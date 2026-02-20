import Link from "next/link";

export default function PublicNotFound() {
  return (
    <div className="relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden px-6 py-24">
      {/* Subtle background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        {/* Icon */}
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
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Label */}
        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
          Error 404
        </span>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Page Not Found
          </h1>
          <p className="max-w-md text-[#94a3b8] leading-relaxed">
            We looked everywhere, but couldn&apos;t find that page. It may have
            been moved, renamed, or never existed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:bg-violet-500"
          >
            Back to Home
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
          >
            Browse Features
          </Link>
        </div>
      </div>
    </div>
  );
}
