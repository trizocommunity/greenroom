import fs from "node:fs";
import path from "node:path";

export type DocArticle = {
  slug: string;
  title: string;
  description: string;
  section: string;
  body: string;
};

export const docOrder = [
  "getting-started",
  "festival-setup",
  "launch-website",
  "dns-setup",
  "custom-subdomain",
  "participants",
  "programmes",
  "schedule",
  "stage-portal",
  "results",
  "payments",
  "troubleshooting",
  "contact-operators",
] as const;

const articlesDir = path.join(process.cwd(), "src", "docs", "articles");

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: raw };
  }

  const data: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const [key, ...value] = line.split(":");
    if (!key || value.length === 0) continue;
    data[key.trim()] = value.join(":").trim();
  }

  return { data, body: match[2].trim() };
}

export function getDocArticle(slug: string): DocArticle | null {
  if (!docOrder.includes(slug as (typeof docOrder)[number])) return null;

  const filePath = path.join(articlesDir, `${slug}.mdx`);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, body } = parseFrontmatter(raw);

  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? "",
    section: data.section ?? "Guide",
    body,
  };
}

export function getAllDocArticles(): DocArticle[] {
  return docOrder
    .map((slug) => getDocArticle(slug))
    .filter((article): article is DocArticle => article !== null);
}

export function getDocsBySection() {
  const sections = new Map<string, DocArticle[]>();

  for (const article of getAllDocArticles()) {
    const items = sections.get(article.section) ?? [];
    items.push(article);
    sections.set(article.section, items);
  }

  return Array.from(sections.entries()).map(([section, articles]) => ({
    section,
    articles,
  }));
}
