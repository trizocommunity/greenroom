import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return { title: "Festival" };
  return {
    title: `${festival.name} – Expired`,
    description: "View details and download results for this ended festival.",
  };
}

export default async function ExpiredFestivalPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.userId) notFound();

  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const isOwner = festival.ownerId === session.userId;
  const isExpired =
    festival.status === "EXPIRED" ||
    (festival.expiresAt && new Date(festival.expiresAt) < new Date());
  if (!isExpired || !isOwner) notFound();

  const hasPdf = !!festival.resultPdfUrl;
  const hasSnapshot =
    (await (async () => {
      const { prisma } = await import("@/lib/db");
      const c = await prisma.expiredFestivalResult.count({
        where: { festivalId: festival.id },
      });
      return c > 0;
    })());

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/profile" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>
      </Button>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="destructive">Expired</Badge>
            <span className="text-sm text-muted-foreground">
              This festival has ended. Results are available only via PDF.
            </span>
          </div>
          <CardTitle className="text-2xl mt-2">{festival.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {festival.description && (
            <p className="text-muted-foreground text-sm">
              {festival.description}
            </p>
          )}
          <dl className="grid gap-2 text-sm">
            {festival.startDate && (
              <>
                <dt className="text-muted-foreground">Start</dt>
                <dd>{new Date(festival.startDate).toLocaleDateString()}</dd>
              </>
            )}
            {festival.endDate && (
              <>
                <dt className="text-muted-foreground">End</dt>
                <dd>{new Date(festival.endDate).toLocaleDateString()}</dd>
              </>
            )}
            {festival.expiredAt && (
              <>
                <dt className="text-muted-foreground">Archived on</dt>
                <dd>{new Date(festival.expiredAt).toLocaleDateString()}</dd>
              </>
            )}
          </dl>

          <div className="pt-4 border-t">
            <p className="font-semibold text-sm mb-2">Result document</p>
            <p className="text-muted-foreground text-sm mb-3">
              Results are not shown in the UI. Download the PDF to view final
              results.
            </p>
            {(hasPdf || hasSnapshot) ? (
              <Button variant="outline" className="gap-2" asChild>
                <Link
                  href={`/api/profile/festivals/${festival.id}/expired-results-pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileDown className="h-4 w-4" />
                  Download Results PDF
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-amber-600">
                No results document is available for this festival.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
