import { createHash } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { ExternalJudgeClient } from "@/components/judge/ExternalJudgeClient";

function hashTokenSHA256(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export default async function JudgeTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const tokenHash = hashTokenSHA256(token);

  const judgeSession = await prisma.programmeJudgeSession.findUnique({
    where: { tokenHash },
    select: {
      programmeId: true,
      festivalId: true,
      reportingSessionId: true,
      startedAt: true,
      usedAt: true,
    },
  });

  if (!judgeSession) {
    return (
      <ExternalJudgeClient
        token={token}
        programmeName="Judging"
        codeLetters={[]}
        startedAt={new Date()}
        isClosed={true}
      />
    );
  }

  const [programme, festival, codeLettersRows] = await Promise.all([
    prisma.programme.findUnique({
      where: { id: judgeSession.programmeId },
      select: { name: true },
    }),
    prisma.festival.findUnique({
      where: { id: judgeSession.festivalId },
      select: { tier: true, slug: true },
    }),
    prisma.programmeCodeLetter.findMany({
      where: {
        programmeId: judgeSession.programmeId,
        reportingSessionId: judgeSession.reportingSessionId,
      },
      select: { code: true },
      orderBy: { issuedAt: "asc" },
    }),
  ]);

  if (!programme || !festival) return notFound();

  const canUseJudging = await getEffectiveFeatureEnabled(
    festival.tier,
    "schedule",
  );

  if (!canUseJudging) {
    return notFound();
  }

  // Maintain the new URL format: `/{festivalSlug}/judge/{token}`
  // so external shares are consistent.
  return redirect(`/${festival.slug}/judge/${token}`);

  // (Unreachable: redirect always returns.)
}

