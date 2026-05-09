import { asc, eq } from "drizzle-orm";
import { ArrowLeft, FileDown } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db } from "@/core/database/client";
import {
  festivalLifecycleEvent as lifecycleEventTable,
  expiredFestivalResult as resultTable,
} from "@/core/database/schema";
import { formatStoredDateTime } from "@/core/utils/date-time";
import { findFestivalBySlugOrId } from "@/features/festivals/repositories/festival.repository";
import { getDerivedFestivalStatus } from "@/features/festivals/services/festival-status.service";

export default async function AdminFestivalDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: slugOrId } = await params;
  const festival = await findFestivalBySlugOrId(slugOrId);

  if (!festival) {
    notFound();
  }

  const festivalId = festival.id;
  const derivedStatus = getDerivedFestivalStatus({
    status: (festival.status ?? "READY") as any,
    startDate: festival.startDate,
    endDate: festival.endDate,
    expiresAt: festival.expiresAt,
  });
  const isExpired = derivedStatus === "EXPIRED";

  const expiredResults = isExpired
    ? await db.query.expiredFestivalResult.findMany({
        where: eq(resultTable.festivalId, festivalId),
        orderBy: [asc(resultTable.programmeName), asc(resultTable.position)],
      })
    : [];

  const lifecycleEvents = isExpired
    ? await db.query.festivalLifecycleEvent.findMany({
        where: eq(lifecycleEventTable.festivalId, festivalId),
        orderBy: [asc(lifecycleEventTable.occurredAt)],
      })
    : [];

  const hasPdf =
    isExpired && (!!festival.resultPdfUrl || expiredResults.length > 0);
  const downloadPdfUrl = festival.resultPdfUrl
    ? festival.resultPdfUrl
    : `/api/festivals/${festival.slug}/expired-results-pdf`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/super-admin/festivals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {festival.name}
          </h2>
          <div className="text-muted-foreground flex items-center gap-2">
            /{festival.slug}
            <Badge
              variant={
                derivedStatus === "EXPIRED"
                  ? "destructive"
                  : derivedStatus === "ONGOING"
                    ? "default"
                    : "secondary"
              }
            >
              {derivedStatus === "EXPIRED"
                ? "Expired"
                : derivedStatus === "ONGOING"
                  ? "Ongoing"
                  : derivedStatus === "PAST"
                    ? "Past"
                    : "Ready"}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Festival Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Owner</span>
              <span className="font-medium">
                {festival.user.fullName || festival.user.email}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created At</span>
              <span>
                {formatStoredDateTime(festival.createdAt, { dateStyle: "medium" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span>{festival.category || "-"}</span>
            </div>
            {isExpired && festival.expiredAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expired At</span>
                <span>
                  {formatStoredDateTime(festival.expiredAt, { dateStyle: "medium" })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">{derivedStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tier</span>
              <span className="font-medium">{festival.tier}</span>
            </div>
            {isExpired && hasPdf && (
              <div className="pt-2">
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <Link
                    href={downloadPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileDown className="h-4 w-4" />
                    Download Result PDF
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isExpired && expiredResults.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>Retained Results Snapshot</CardTitle>
              <p className="text-sm text-muted-foreground">
                {expiredResults.length} result row(s) retained after expiration.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-64 overflow-y-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Programme</th>
                      <th className="text-left p-2">Participant</th>
                      <th className="text-left p-2">Position</th>
                      <th className="text-left p-2">Grade</th>
                      <th className="text-left p-2">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiredResults.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2">{r.programmeName}</td>
                        <td className="p-2">{r.participantName}</td>
                        <td className="p-2">{r.position ?? "—"}</td>
                        <td className="p-2">{r.grade ?? "—"}</td>
                        <td className="p-2">{r.points ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {isExpired && lifecycleEvents.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>Lifecycle History</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {lifecycleEvents.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-3 text-sm">
                    <Badge variant="outline">{ev.event}</Badge>
                    <span className="text-muted-foreground">
                      {formatStoredDateTime(ev.occurredAt, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
