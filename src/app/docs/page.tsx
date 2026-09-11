import { ArrowRight, BookOpen, Globe2, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { getAllDocArticles, getDocsBySection } from "@/docs/docs";
import { DocsLayout } from "./_components/DocsLayout";

export const metadata = {
  title: "Greenroom Docs | User Guide",
  description: "Public user guide for Greenroom Festival.",
};

export default function DocsIndexPage() {
  const articles = getAllDocArticles();
  const sections = getDocsBySection();

  return (
    <DocsLayout>
      <div className="space-y-8">
        <section className="rounded-lg border bg-card p-6 sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Greenroom user guide
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg">
              Public documentation for setting up festivals, launching the
              website, running event-day workflows, publishing results, and
              resolving common DNS issues.
            </p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/docs/dns-setup"
            className="rounded-lg border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm"
          >
            <Globe2 className="mb-4 h-6 w-6 text-primary" />
            <h2 className="font-semibold">DNS Setup Guide</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Connect a custom subdomain, verify DNS, and finish HTTPS
              provisioning.
            </p>
          </Link>
          <Link
            href="/docs/contact-operators"
            className="rounded-lg border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm"
          >
            <LifeBuoy className="mb-4 h-6 w-6 text-primary" />
            <h2 className="font-semibold">Contact Operators</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Know what to send when setup, DNS, or launch needs operator help.
            </p>
          </Link>
        </section>

        <section className="space-y-6">
          {sections.map((section) => (
            <div key={section.section}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {section.section}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {section.articles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/docs/${article.slug}`}
                    className="group flex items-start justify-between gap-4 rounded-lg border bg-card p-4 transition hover:border-primary/50"
                  >
                    <span>
                      <span className="font-medium">{article.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                        {article.description}
                      </span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        <p className="text-sm text-muted-foreground">
          {articles.length} public guides available.
        </p>
      </div>
    </DocsLayout>
  );
}
