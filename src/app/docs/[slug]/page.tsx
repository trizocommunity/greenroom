import { notFound } from "next/navigation";
import { docOrder, getDocArticle } from "@/docs/docs";
import { DocsLayout } from "../_components/DocsLayout";

export function generateStaticParams() {
  return docOrder.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getDocArticle(slug);

  if (!article) return {};

  return {
    title: `${article.title} | Greenroom Docs`,
    description: article.description,
  };
}

export default async function DocArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getDocArticle(slug);

  if (!article) notFound();

  return (
    <DocsLayout activeSlug={article.slug}>
      <div className="docs-article rounded-lg border bg-card p-6 sm:p-8">
        <p className="mb-3 text-sm font-medium text-primary">
          {article.section}
        </p>
        <article.component />
      </div>
    </DocsLayout>
  );
}
