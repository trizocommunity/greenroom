import Link from "next/link";

export default function PublicNotFound() {
  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-6 pb-24 pt-32">
      {/* Subtle background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        {/* Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card backdrop-blur-sm">
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
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Label */}
        <span className="text-eyebrow">Error 404</span>

        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-heading">
            Page not found
          </h1>
          <p className="max-w-md text-muted-foreground leading-relaxed">
            We looked everywhere, but couldn&apos;t find that page. It may have
            been moved, renamed, or never existed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-primary-glow transition-opacity hover:opacity-90"
          >
            Back to home
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Browse features
          </Link>
        </div>
      </div>
    </div>
  );
}
