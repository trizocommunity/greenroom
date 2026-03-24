import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import {
  getProgrammeStatusPriorityRank,
} from "@/lib/programme-status-priority";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { findFestivalBySlug } from "@/server/models/festival.model";
import {
  findStudentByFestivalAndId,
  findStudentByFestivalAndProfileSlug,
} from "@/server/models/student.model";
import type { ProgrammeStatus } from "@prisma/client";

const RESERVED_SLUGS = new Set([
  "results",
  "gallery",
  "news",
  "programmes",
  "sessions",
  "about",
]);

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export default async function AssignedProgrammesPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
  if (RESERVED_SLUGS.has(studentSlug)) notFound();

  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const canViewProfile = FeatureService.isFeatureEnabled(
    getTierForFeatureCheck(festival.tier),
    "publicStudentProfile",
  );
  if (!canViewProfile) notFound();

  const student = looksLikeUuid(studentSlug)
    ? await findStudentByFestivalAndId(festival.id, studentSlug)
    : await findStudentByFestivalAndProfileSlug(festival.id, studentSlug);
  if (!student) notFound();

  if (student.isTeamLeader) notFound();

  const programmeById = new Map<
    string,
    { programmeId: string; name: string; categoryName: string | null; status: ProgrammeStatus }
  >();

  for (const a of student.assignments ?? []) {
    const p = a.programme;
    if (!p?.id) continue;
    if (!p.status) continue;
    if (programmeById.has(p.id)) continue;
    programmeById.set(p.id, {
      programmeId: p.id,
      name: p.name,
      categoryName: p.category?.name ?? null,
      status: p.status,
    });
  }

  const programmes = Array.from(programmeById.values()).sort((a, b) => {
    return getProgrammeStatusPriorityRank(a.status) - getProgrammeStatusPriorityRank(b.status);
  });

  const assignedProgrammes = programmes;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assigned Programmes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live statuses are shown based on your programme lifecycle.
        </p>
      </div>

      {assignedProgrammes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No assigned programmes yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignedProgrammes.map((p) => (
            <Card key={p.programmeId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <ProgrammeStatusBadge status={p.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground space-y-2">
                <div>
                  Category: <span className="text-foreground">{p.categoryName ?? "—"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

