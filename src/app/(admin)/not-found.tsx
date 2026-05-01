import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      {/* Subtle glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <svg
            className="h-8 w-8 text-violet-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
          Admin · 404
        </span>

        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Admin Page Not Found
          </h1>
          <p className="max-w-sm text-[#94a3b8] text-sm leading-relaxed">
            This admin route doesn&apos;t exist. It may have been removed or the
            URL is incorrect.
          </p>
        </div>

        <Link
          href="/super-admin"
          className="mt-2 inline-flex items-center justify-center rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:bg-violet-500"
        >
          Back to Admin Dashboard
        </Link>
      </div>
    </div>
  );
}
