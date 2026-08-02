import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { SITE_CONTAINER } from "@/components/layout/Section";
import { cn } from "@/core/utils/cn";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { name: "Features", href: "/features" },
      { name: "Services", href: "/services" },
      { name: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Account",
    links: [
      { name: "Log in", href: "/login" },
      { name: "Get started", href: "/login" },
    ],
  },
];

/**
 * Closing statement first, links second, and an oversized wordmark that runs
 * to the container edges as the full stop.
 */
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className={cn(SITE_CONTAINER, "pt-16 md:pt-20")}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <p className="max-w-md text-2xl font-medium leading-[1.3] tracking-tight text-heading md:text-[1.75rem]">
              Run your next festival{" "}
              <span className="font-display italic font-normal text-primary">
                without the paperwork.
              </span>
            </p>
            <Link
              href="/login"
              className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-70"
            >
              Get started
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {column.heading}
                </h2>
                <ul className="space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Wordmark */}
        <div
          aria-hidden
          className="mt-16 select-none border-t border-border pt-8"
        >
          <p className="bg-gradient-to-b from-heading/[0.14] to-heading/[0.03] bg-clip-text text-[16vw] font-semibold leading-[0.8] tracking-tighter text-transparent lg:text-[10.5rem]">
            Greenroom
          </p>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Greenroom. All rights reserved.</p>
          <div className="flex gap-6">
            <Link
              href="/contact"
              className="transition-colors hover:text-foreground"
            >
              Support
            </Link>
            <Link
              href="/pricing"
              className="transition-colors hover:text-foreground"
            >
              Plans
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
