import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { ExternalJudgeClient } from "@/components/judge/ExternalJudgeClient";

function hashTokenSHA256(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export default async function JudgeTokenPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug: festivalSlug, token } = await params;

  const tokenHash = hashTokenSHA256(token);

  const [judgeSession, festival] = await Promise.all([
    prisma.programmeJudgeSession.findUnique({
      where: { tokenHash },
      select: {
        programmeId: true,
        festivalId: true,
        reportingSessionId: true,
        startedAt: true,
        usedAt: true,
      },
    }),
    prisma.festival.findUnique({
      where: { slug: festivalSlug },
      select: { id: true, tier: true },
    }),
  ]);

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

  if (!festival || festival.id !== judgeSession.festivalId) {
    return notFound();
  }

  const canUseJudging = await getEffectiveFeatureEnabled(
    festival.tier,
    "schedule",
  );
  if (!canUseJudging) return notFound();

  const [programme, codeLettersRows] = await Promise.all([
    prisma.programme.findUnique({
      where: { id: judgeSession.programmeId },
      select: { name: true },
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

  if (!programme) return notFound();

  // Judge GET should never reveal any student/team info; only code letters.
  const isClosed = Boolean(judgeSession.usedAt);

  return (
    <ExternalJudgeClient
      token={token}
      programmeName={programme.name}
      codeLetters={codeLettersRows.map((r) => r.code)}
      startedAt={judgeSession.startedAt}
      isClosed={isClosed}
    />
  );
}

