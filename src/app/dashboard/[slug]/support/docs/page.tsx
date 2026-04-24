import { getSession } from "@/core/auth/session";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import DocumentationContent from "./DocumentationContent";

export default async function DocumentationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });
  const role = context?.role && context.role !== "NONE" ? context.role : null;

  return <DocumentationContent role={role} />;
}
