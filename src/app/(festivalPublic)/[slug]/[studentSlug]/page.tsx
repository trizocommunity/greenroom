import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_URL } from "@/config/routes";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { findStudentByFestivalAndProfileSlug } from "@/server/models/student.model";
import { Mail, Phone, User, Hash, Users, FolderOpen, ListTodo } from "lucide-react";

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListTodo className="h-5 w-5" style={{ color: accentColor }} />
            Programmes (Reporting)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Programmes this student is added to. Use this when they report for an event.
          </p>
        </CardHeader>
        <CardContent>
          {student.assignments && student.assignments.length > 0 ? (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
