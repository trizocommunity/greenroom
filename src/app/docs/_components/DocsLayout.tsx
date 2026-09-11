import { BookOpen, LifeBuoy, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getDocsBySection } from "@/docs/docs";

export function DocsLayout({
  activeSlug,
  children,
}: {
  activeSlug?: string;
  children: ReactNode;
}) {
  const sections = getDocsBySection();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-semibold">
                Greenroom Docs
              </span>
              <span className="block text-sm text-muted-foreground">
                User guide for paperless festival management
              </span>
            </span>
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground sm:w-72">
              <Search className="h-4 w-4" />
              <span>Search coming soon</span>
            </div>
            <Link
              href="/docs/contact-operators"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              <LifeBuoy className="h-4 w-4" />
              Contact Operators
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav className="space-y-6 rounded-lg border bg-card p-4">
            {sections.map((section) => (
              <div key={section.section}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.section}
                </h2>
                <div className="space-y-1">
                  {section.articles.map((article) => {
                    const isActive = article.slug === activeSlug;
                    return (
                      <Link
                        key={article.slug}
                        href={`/docs/${article.slug}`}
                        className={
                          isActive
                            ? "block rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                            : "block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      >
                        {article.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        {children}
      </div>
    </main>
  );
}
