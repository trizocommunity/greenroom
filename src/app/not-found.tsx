import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      {/* Ambient glow orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-secondary/10 blur-[100px]" />
        {/* Dot grid */}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="dot-grid"
              x="0"
              y="0"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        {/* Greenroom wordmark */}
        <span className="text-eyebrow">Greenroom</span>

        {/* 404 gradient heading */}
        <h1
          className="text-[9rem] font-bold leading-none tracking-tight"
          style={{
            background:
              "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          404
        </h1>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-heading">
            Page Not Found
          </h2>
          <p className="max-w-sm text-muted-foreground text-base leading-relaxed">
            This page doesn&apos;t exist or has been moved. Double-check the
            URL, or head back to safety.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-primary-glow transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Go home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
