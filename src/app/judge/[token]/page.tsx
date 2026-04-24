import { createHash } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { ExternalJudgeClient } from "@/components/judge/ExternalJudgeClient";
import { db } from "@/lib/db";
import { 
  programmeJudgeSession as judgeSessionTable,
  programme as programmeTable,
  festival as festivalTable,
  programmeCodeLetter as codeLetterTable
} from "@/server/db/schema";
import { eq, and, asc } from "drizzle-orm";
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

  const judgeSession = await db.query.programmeJudgeSession.findFirst({
    where: eq(judgeSessionTable.tokenHash, tokenHash),
    columns: {
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
    db.query.programme.findFirst({
      where: eq(programmeTable.id, judgeSession.programmeId),
      columns: { name: true },
    }),
    db.query.festival.findFirst({
      where: eq(festivalTable.id, judgeSession.festivalId),
      columns: { tier: true, slug: true },
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

  if (!programme || !festival) return notFound();

  const canUseJudging = await getEffectiveFeatureTagEnabled(
    festival.tier as any,
    "eventWorks.externalJudging",
  );

  if (!canUseJudging) {
    return notFound();
  }

  return redirect(`/${festival.slug}/judge/${token}`);
}
