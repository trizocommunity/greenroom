import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { ExternalJudgeClient } from "@/components/judge/ExternalJudgeClient";
import { prisma } from "@/lib/db";
import { acquireJudgeOpenLockAction } from "@/server/actions/programme-judging.actions";
import { getEffectiveFeatureTagEnabled } from "@/server/services/plan-features-tags.service";

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
      where: { token_hash: tokenHash },
      select: {
        programme_id: true,
        festival_id: true,
        reporting_session_id: true,
        started_at: true,
        used_at: true,
      },
    }),
    prisma.festival.findUnique({
      where: { slug: festivalSlug },
      select: {
        id: true,
        tier: true,
        name: true,
        slug: true,
        location: true,
        startDate: true,
        endDate: true,
      },
    }),
  ]);

  if (!judgeSession) return notFound();

  if (!festival || festival.id !== judgeSession.festival_id) {
    return notFound();
  }

  const canUseJudging = await getEffectiveFeatureTagEnabled(
    festival.tier,
    "eventWorks.externalJudging",
  );
  if (!canUseJudging) return notFound();

  const [programme, scheduleEntry, codeLettersRows] = await Promise.all([
    prisma.programme.findUnique({
      where: { id: judgeSession.programme_id },
      select: {
        name: true,
        type: true,
        category: { select: { name: true } },
      },
    }),
    prisma.scheduleEntry.findFirst({
      where: {
        festivalId: judgeSession.festival_id,
        programmeId: judgeSession.programme_id,
        type: "PROGRAMME",
      },
      orderBy: { startTime: "asc" },
      select: { stage: { select: { name: true } } },
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

  if (!programme) return notFound();

  const recentJudgeSessions = await prisma.programmeJudgeSession.findMany({
    where: {
      festival_id: judgeSession.festival_id,
      used_at: { not: null },
      submitted_by_name: { not: null },
    },
    orderBy: { used_at: "desc" },
    select: {
      submitted_by_name: true,
      submitted_by_contact: true,
      submitted_by_note: true,
      used_at: true,
    },
    take: 20,
  });

  const seen = new Set<string>();
  const recentJudges = recentJudgeSessions
    .map((s) => ({
      judgeName: s.submitted_by_name?.trim() ?? "",
      judgeContact: s.submitted_by_contact?.trim() || "",
      judgeNote: s.submitted_by_note?.trim() || "",
      judgedAt: s.used_at?.toISOString() ?? "",
    }))
    .filter((j) => {
      if (!j.judgeName) return false;
      const key = `${j.judgeName.toLowerCase()}|${j.judgeContact.toLowerCase()}|${j.judgeNote.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);

  // Judge GET should never reveal any student/team info; only code letters.
  const isClosed = Boolean(judgeSession.used_at);
  let openNonce: string | null = null;
  let lockState: "open" | "in_use" | "closed" = isClosed ? "closed" : "open";

  if (!isClosed) {
    const lockRes = await acquireJudgeOpenLockAction(token);
    if (!lockRes.success) {
      lockState = "in_use";
    } else {
      openNonce = lockRes.data.openNonce;
    }
  }

  return (
    <ExternalJudgeClient
      token={token}
      programmeName={programme.name}
      festival={{
        name: festival.name,
        slug: festival.slug,
        location: festival.location,
        startDate: festival.startDate?.toISOString() ?? null,
        endDate: festival.endDate?.toISOString() ?? null,
      }}
      programmeDetails={{
        stageName: scheduleEntry?.stage?.name ?? null,
        categoryName: programme.category?.name ?? null,
        programmeType: programme.type,
      }}
      codeLetters={codeLettersRows.map((r) => r.code)}
      startedAt={judgeSession.started_at}
      isClosed={isClosed || lockState === "in_use"}
      openNonce={openNonce}
      lockState={lockState}
      recentJudges={recentJudges}
    />
  );
}
