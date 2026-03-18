import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_URL } from "@/config/routes";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { prisma } from "@/lib/db";
import { findStudentByFestivalAndProfileSlug } from "@/server/models/student.model";
import { ChevronDown, FolderOpen, Hash, ListTodo, Mail, Phone, User, Users } from "lucide-react";

/** Reserved path segments under /[slug] — do not treat as student slug */
const RESERVED_SLUGS = new Set([
  "results",
  "gallery",
  "news",
  "programmes",
  "sessions",
  "about",
]);

interface PageProps {
  params: Promise<{ slug: string; studentSlug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, studentSlug } = await params;
  if (RESERVED_SLUGS.has(studentSlug)) return { title: "Not Found" };
  const festival = await findFestivalBySlug(slug);
  if (!festival) return { title: "Not Found" };
  if (!FeatureService.isFeatureEnabled(getTierForFeatureCheck(festival.tier), "publicStudentProfile")) {
    return { title: "Not Found" };
  }
  const student = await findStudentByFestivalAndProfileSlug(festival.id, studentSlug);
  if (!student) return { title: "Student Not Found" };
  const title = `${student.name} – ${festival.name} Student`;
  const description = `Student profile: ${student.name}${student.chestNumber ? ` (Chest ${student.chestNumber})` : ""}. ${festival.name}.`;
  const canonicalUrl = `${APP_URL.replace(/\/$/, "")}/${slug}/${studentSlug}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description: `Student profile for ${festival.name}.`,
      url: canonicalUrl,
    },
    alternates: { canonical: canonicalUrl },
  };
}

export default async function PublicStudentProfilePage({ params }: PageProps) {
  const { slug, studentSlug } = await params;

  if (RESERVED_SLUGS.has(studentSlug)) notFound();

  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  if (!FeatureService.isFeatureEnabled(getTierForFeatureCheck(festival.tier), "publicStudentProfile")) {
    notFound();
  }

  const student = await findStudentByFestivalAndProfileSlug(festival.id, studentSlug);
  if (!student) notFound();

  const accentColor =
    festival.branding &&
    typeof festival.branding === "object" &&
    "colors" in festival.branding &&
    festival.branding.colors &&
    typeof (festival.branding as { colors?: { primary?: string } }).colors?.primary === "string"
      ? (festival.branding as { colors: { primary: string } }).colors.primary
      : "#000000";

  // Team-leader dashboard experience (STANDARD+ feature).
  const isTeamLeader = Boolean(student.isTeamLeader);
  const assignments = student.assignments ?? [];

  type StudentForDisplay = {
    id: string;
    name: string;
    chestNumber: string | null;
    categoryName: string | null;
  };

  type GroupTeamContextKey = {
    programmeId: string;
    groupId: string;
    teamNumber: number;
  };

  type ProgrammeContext = {
    key: string;
    programmeId: string;
    programmeName: string;
    programmeCategoryName: string | null;
    programmeType: string;
    stageType: string | null;
    groupId: string | null;
    teamNumber: number | null;
    members: StudentForDisplay[];
  };

  const myTeamStudents: StudentForDisplay[] = [];
  const programmeContexts: ProgrammeContext[] = [];

  if (isTeamLeader) {
    const myStudentId = student.id;

    const groupContextsByKey = new Map<string, GroupTeamContextKey>();
    for (const a of assignments) {
      if (a.programme?.type !== "GROUP") continue;
      if (!a.groupId) continue;
      const teamNumber = a.teamNumber ?? 1;
      const programmeId = a.programmeId;
      if (!programmeId) continue;
      const key = `${programmeId}:${a.groupId}:${teamNumber}`;
      if (!groupContextsByKey.has(key)) {
        groupContextsByKey.set(key, {
          programmeId,
          groupId: a.groupId,
          teamNumber,
        });
      }
    }

    const membersByContextKey = new Map<string, StudentForDisplay[]>();

    // Fetch all participants for each team context led by this leader.
    for (const [key, ctx] of groupContextsByKey) {
      const rows = await prisma.programmeAssignment.findMany({
        where: {
          festivalId: festival.id,
          programmeId: ctx.programmeId,
          groupId: ctx.groupId,
          teamNumber: ctx.teamNumber,
          studentId: { not: null },
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              chestNumber: true,
              category: { select: { name: true } },
            },
          },
        },
      });

      const members: StudentForDisplay[] = rows
        .map((r) => {
          if (!r.student) return null;
          return {
            id: r.student.id,
            name: r.student.name,
            chestNumber: r.student.chestNumber,
            categoryName: r.student.category?.name ?? null,
          };
        })
        .filter(Boolean) as StudentForDisplay[];

      membersByContextKey.set(key, members);
    }

    // Build the "all programmes" view for this team leader.
    const seenProgrammeContextKeys = new Set<string>();
    for (const a of assignments) {
      const programme = a.programme;
      if (!programme?.id) continue;

      const programmeId = programme.id;
      const programmeType = programme.type;
      const programmeName = programme.name;
      const stageType = programme.stageType ?? null;
      const programmeCategoryName = programme.category?.name ?? null;

      if (programmeType === "GROUP") {
        if (!a.groupId || !a.teamNumber) continue;
        const key = `${programmeId}:${a.groupId}:${a.teamNumber}`;
        if (seenProgrammeContextKeys.has(key)) continue;
        seenProgrammeContextKeys.add(key);

        const members = membersByContextKey.get(key) ?? [];
        programmeContexts.push({
          key,
          programmeId,
          programmeName,
          programmeCategoryName,
          programmeType,
          stageType,
          groupId: a.groupId ?? null,
          teamNumber: a.teamNumber ?? null,
          members,
        });
      } else {
        const key = `${programmeId}:INDIVIDUAL`;
        if (seenProgrammeContextKeys.has(key)) continue;
        seenProgrammeContextKeys.add(key);

        programmeContexts.push({
          key,
          programmeId,
          programmeName,
          programmeCategoryName,
          programmeType,
          stageType,
          groupId: student.groupId ?? null,
          teamNumber: null,
          members: [
            {
              id: myStudentId,
              name: student.name,
              chestNumber: student.chestNumber,
              categoryName: student.category?.name ?? null,
            },
          ],
        });
      }
    }

    // Compute "my students" as the union across all led group-team contexts.
    const uniqueMembers = new Map<string, StudentForDisplay>();
    for (const ctx of programmeContexts) {
      for (const m of ctx.members) {
        if (!uniqueMembers.has(m.id)) uniqueMembers.set(m.id, m);
      }
    }
    myTeamStudents.push(...Array.from(uniqueMembers.values()));
  }

  return (
    <div className="container max-w-2xl py-8 px-4">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-1">{festival.name}</p>
        <h1 className="text-2xl font-bold tracking-tight">Student Profile</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" style={{ color: accentColor }} />
            Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground font-medium">Name</span>
            <span>{student.name}</span>
          </div>
          {student.chestNumber && (
            <div className="flex items-center gap-3">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">Chest Number</span>
              <span className="font-mono font-semibold" style={{ color: accentColor }}>
                {student.chestNumber}
              </span>
            </div>
          )}
          {student.category && (
            <div className="flex items-center gap-3">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">Category</span>
              <span>{student.category.name}</span>
            </div>
          )}
          {student.group && (
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">Group</span>
              <span>{student.group.name}</span>
            </div>
          )}
          {student.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${student.email}`} className="text-primary hover:underline">
                {student.email}
              </a>
            </div>
          )}
          {student.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${student.phone}`} className="text-primary hover:underline">
                {student.phone}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {isTeamLeader && (
        <Card className="mb-6 mt-6 overflow-hidden">
          <CardHeader>
            <div className="flex flex-col gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                You are a Team Leader
              </CardTitle>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Group:{" "}
                  <span style={{ color: accentColor, fontWeight: 700 }}>{student.group?.name ?? "—"}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-500/5 border-amber-500/40 text-amber-700 dark:text-amber-300">
                    <span className="font-semibold">{myTeamStudents.length}</span> My students
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {myTeamStudents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {myTeamStudents.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border bg-muted/20 px-3 py-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      {s.categoryName ? (
                        <p className="text-xs text-muted-foreground truncate">{s.categoryName}</p>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {s.chestNumber ? `#${s.chestNumber}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No team members found yet. Make sure the group has team leaders assigned.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListTodo className="h-5 w-5" style={{ color: accentColor }} />
            {isTeamLeader ? "All Programmes (My Team)" : "Programmes (Reporting)"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isTeamLeader
              ? "View programme details to see who participated from your team."
              : "Programmes this student is added to. Use this when they report for an event."}
          </p>
        </CardHeader>
        <CardContent>
          {isTeamLeader ? (
            programmeContexts.length > 0 ? (
              <ul className="space-y-3">
                {programmeContexts.map((ctx) => (
                  <li
                    key={ctx.key}
                    className="rounded-lg border bg-muted/10 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{ctx.programmeName}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {ctx.programmeCategoryName ? ctx.programmeCategoryName : "—"}
                          {ctx.programmeType === "GROUP" && ctx.teamNumber != null ? ` · Team ${ctx.teamNumber}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className="bg-muted/20 border-muted-foreground/20 text-foreground/80"
                        >
                          {ctx.members.length} Participants
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {ctx.programmeType}
                        </Badge>
                      </div>
                    </div>

                    <details className="mt-3">
                      <summary className="cursor-pointer list-none text-sm font-medium text-primary inline-flex items-center gap-2">
                        <span className="inline-flex items-center justify-center rounded-md bg-primary/10 px-2 py-0.5">
                          View details
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </summary>
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">From your team</p>
                        {ctx.members.length > 0 ? (
                          <ul className="space-y-2">
                            {ctx.members.map((m) => (
                              <li
                                key={m.id}
                                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2"
                              >
                                <span className="font-medium truncate pr-2">{m.name}</span>
                                <span className="text-xs text-muted-foreground font-mono shrink-0">
                                  {m.chestNumber ? `#${m.chestNumber}` : "—"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No participants found.</p>
                        )}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No programmes found for your team yet.
              </p>
            )
          ) : (
            student.assignments && student.assignments.length > 0 ? (
            <ul className="space-y-2">
              {student.assignments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <span className="font-medium">{a.programme?.name ?? "Programme"}</span>
                  {a.programme?.category?.name && (
                    <span className="text-sm text-muted-foreground">
                      {a.programme.category.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not assigned to any programme yet.
              </p>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
