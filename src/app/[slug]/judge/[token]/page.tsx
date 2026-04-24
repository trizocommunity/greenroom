import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { ExternalJudgeClient } from "@/components/judge/ExternalJudgeClient";
import { db } from "@/lib/db";
import { 
  programmeJudgeSession as judgeSessionTable,
  festival as festivalTable,
  programme as programmeTable,
  scheduleEntry as scheduleEntryTable,
  programmeCodeLetter as codeLetterTable
} from "@/server/db/schema";
import { eq, and, isNotNull, asc, desc } from "drizzle-orm";
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
    db.query.programmeJudgeSession.findFirst({
      where: eq(judgeSessionTable.tokenHash, tokenHash),
      columns: {
        programmeId: true,
        festivalId: true,
        reportingSessionId: true,
        startedAt: true,
        usedAt: true,
      },
    }),
    db.query.festival.findFirst({
      where: eq(festivalTable.slug, festivalSlug),
      columns: {
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

  if (!festival || festival.id !== judgeSession.festivalId) {
    return notFound();
  }

  const canUseJudging = await getEffectiveFeatureTagEnabled(
    festival.tier as any,
    "eventWorks.externalJudging",
  );
  if (!canUseJudging) return notFound();

  const [programme, scheduleEntry, codeLettersRows] = await Promise.all([
    db.query.programme.findFirst({
      where: eq(programmeTable.id, judgeSession.programmeId),
      with: {
        category: { columns: { name: true } },
      },
      columns: {
        name: true,
        type: true,
      },
    }),
    db.query.scheduleEntry.findFirst({
      where: and(
        eq(scheduleEntryTable.festivalId, judgeSession.festivalId),
        eq(scheduleEntryTable.programmeId, judgeSession.programmeId),
        eq(scheduleEntryTable.type, "PROGRAMME")
      ),
      orderBy: [asc(scheduleEntryTable.startTime)],
      with: { stage: { columns: { name: true } } },
    }),
    db.query.programmeCodeLetter.findMany({
      where: and(
        eq(codeLetterTable.programmeId, judgeSession.programmeId),
        eq(codeLetterTable.reportingSessionId, judgeSession.reportingSessionId)
      ),
      columns: { code: true },
      orderBy: [asc(codeLetterTable.issuedAt)],
    }),
  ]);

  if (!programme) return notFound();

  const recentJudgeSessions = await db.query.programmeJudgeSession.findMany({
    where: and(
      eq(judgeSessionTable.festivalId, judgeSession.festivalId),
      isNotNull(judgeSessionTable.usedAt),
      isNotNull(judgeSessionTable.submittedByName)
    ),
    orderBy: [desc(judgeSessionTable.usedAt)],
    columns: {
      submittedByName: true,
      submittedByContact: true,
      submittedByNote: true,
      usedAt: true,
    },
    limit: 20,
  });

  const seen = new Set<string>();
  const recentJudges = recentJudgeSessions
    .map((s) => ({
      judgeName: s.submittedByName?.trim() ?? "",
      judgeContact: s.submittedByContact?.trim() || "",
      judgeNote: s.submittedByNote?.trim() || "",
      judgedAt: s.usedAt ?? "",
    }))
    .filter((j) => {
      if (!j.judgeName) return false;
      const key = `${j.judgeName.toLowerCase()}|${j.judgeContact.toLowerCase()}|${j.judgeNote.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);

  const isClosed = Boolean(judgeSession.usedAt);
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
        startDate: festival.startDate ?? null,
        endDate: festival.endDate ?? null,
      }}
      programmeDetails={{
        stageName: (scheduleEntry as any)?.stage?.name ?? null,
        categoryName: (programme as any).category?.name ?? null,
        programmeType: programme.type as any,
      }}
      codeLetters={codeLettersRows.map((r) => r.code)}
      startedAt={new Date(judgeSession.startedAt)}
      isClosed={isClosed || lockState === "in_use"}
      openNonce={openNonce}
      lockState={lockState}
      recentJudges={recentJudges}
    />
  );
}
