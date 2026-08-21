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
  result as resultTable,
} from "@/core/database/schema";
import { formatDate, formatDateTime } from "@/core/datetime";
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
    ? await db.query.result.findMany({
        where: eq(resultTable.festivalId, festivalId),
        orderBy: [asc(resultTable.position)],
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
      <div className="flex items-start gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/super-admin/festivals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight break-words">
            {festival.name}
          </h2>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            <span className="truncate">/{festival.slug}</span>
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
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Festival details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Owner</span>
              <span className="font-medium break-all text-right">
                {festival.user.fullName || festival.user.email}
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Created At</span>
              <span className="text-right">
                {formatDate(festival.createdAt, {
                  style: "medium",
                })}
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Category</span>
              <span className="text-right">{festival.category || "-"}</span>
            </div>
            {isExpired && festival.expiredAt && (
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <span className="text-muted-foreground">Expired At</span>
                <span className="text-right">
                  {formatDate(festival.expiredAt, {
                    style: "medium",
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Quick stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">{derivedStatus}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Tier</span>
              <span className="font-medium">{festival.tier}</span>
            </div>
            {isExpired && hasPdf && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full font-medium w-full sm:w-auto"
                  asChild
                >
                  <Link
                    href={downloadPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileDown className="h-4 w-4" />
                    Download result PDF
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
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Retained results</CardTitle>
              <p className="text-sm text-muted-foreground">
                {expiredResults.length} result row(s) retained on the live
                <code className="px-1 mx-1 rounded bg-muted">result</code>
                table after expiration.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-border">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Programme ID</th>
                      <th className="text-left p-2">Assignment ID</th>
                      <th className="text-left p-2">Position</th>
                      <th className="text-left p-2">Grade</th>
                      <th className="text-left p-2">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiredResults.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2 font-mono text-xs whitespace-nowrap">
                          {r.programmeId}
                        </td>
                        <td className="p-2 font-mono text-xs whitespace-nowrap">
                          {r.assignmentId}
                        </td>
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
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Lifecycle history</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {lifecycleEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm"
                  >
                    <Badge variant="outline">{ev.event}</Badge>
                    <span className="text-muted-foreground">
                      {formatDateTime(ev.occurredAt, {
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
