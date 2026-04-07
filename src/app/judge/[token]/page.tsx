import { createHash } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { ExternalJudgeClient } from "@/components/judge/ExternalJudgeClient";
import { prisma } from "@/lib/db";
import { getEffectiveFeatureTagEnabled } from "@/server/services/plan-features-tags.service";

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
    where: { token_hash: tokenHash },
    select: {
      programme_id: true,
      festival_id: true,
      reporting_session_id: true,
      started_at: true,
      used_at: true,
    },
  });

  if (!judgeSession) {
    return (
      <ExternalJudgeClient
        token={token}
        programmeName="Judging"
        festival={{
          name: "Festival",
          slug: "festival",
          location: null,
          startDate: null,
          endDate: null,
        }}
        programmeDetails={{
          stageName: null,
          categoryName: null,
          programmeType: null,
        }}
        codeLetters={[]}
        startedAt={new Date()}
        isClosed={true}
        openNonce={null}
        lockState="closed"
        recentJudges={[]}
      />
    );
  }

  const [programme, festival, codeLettersRows] = await Promise.all([
    prisma.programme.findUnique({
      where: { id: judgeSession.programme_id },
      select: { name: true },
    }),
    prisma.festival.findUnique({
      where: { id: judgeSession.festival_id },
      select: { tier: true, slug: true },
    }),
    prisma.programmeCodeLetter.findMany({
      where: {
        programmeId: judgeSession.programme_id,
        reportingSessionId: judgeSession.reporting_session_id,
      },
      select: { code: true },
      orderBy: { issuedAt: "asc" },
    }),
  ]);

  if (!programme || !festival) return notFound();

  const canUseJudging = await getEffectiveFeatureTagEnabled(
    festival.tier,
    "eventWorks.externalJudging",
  );

  if (!canUseJudging) {
    return notFound();
  }

  // Maintain the new URL format: `/{festivalSlug}/judge/{token}`
  // so external shares are consistent.
  return redirect(`/${festival.slug}/judge/${token}`);

  // (Unreachable: redirect always returns.)
}
