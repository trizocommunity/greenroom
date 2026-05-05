import { notFound } from "next/navigation";
import { ExternalJudgeClient } from "@/components/judge/ExternalJudgeClient";
import { getPublicJudgmentByTokenAction } from "@/features/judgment/actions/judgment.actions";

export default async function JudgeTokenPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug: festivalSlug, token } = await params;
  const payload = await getPublicJudgmentByTokenAction({ festivalSlug, token });
  if (!payload) return notFound();

  return <ExternalJudgeClient token={token} payload={payload} />;
}
