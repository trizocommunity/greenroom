import Link from "next/link";

export default function FestivalPublicNotFound() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-secondary/10 blur-[80px]" />
        {/* Dot grid */}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.035]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="dot-grid-festival"
              x="0"
              y="0"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid-festival)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        {/* Festival icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 backdrop-blur-sm">
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

        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
          Festival · 404
        </span>

        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-heading">
            Page Not Found
          </h1>
          <p className="max-w-md text-muted-foreground leading-relaxed">
            This festival page couldn&apos;t be found. The event may have ended,
            or the link might be incorrect. Please check the URL and try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary-hover"
          >
            Explore Greenroom
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:bg-muted"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
