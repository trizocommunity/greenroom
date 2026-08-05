import { count, eq } from "drizzle-orm";
import { FileDown, Image, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/core/database/client";
import {
  festivalPosterTemplate,
  festival as festivalTable,
} from "@/core/database/schema";

interface MediaOverviewProps {
  festivalSlug: string;
}

export async function MediaOverview({ festivalSlug }: MediaOverviewProps) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true },
  });
  if (!festival) return null;

  const basePath = `/dashboard/${festivalSlug}`;

  const templateCount = await db
    .select({ value: count() })
    .from(festivalPosterTemplate)
    .where(eq(festivalPosterTemplate.festivalId, festival.id))
    .then((rows) => rows[0]?.value ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Media Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage poster templates and export festival assets.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Templates
            </CardTitle>
            <div className="p-1.5 bg-violet-50 text-violet-600 rounded-md dark:bg-violet-950 dark:text-violet-400">
              <LayoutTemplate className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{templateCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Poster templates created
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href={`${basePath}/templates`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <LayoutTemplate className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Templates</CardTitle>
                  <CardDescription>
                    Design and manage poster templates for results.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`${basePath}/exports`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileDown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Exports</CardTitle>
                  <CardDescription>
                    Download participant lists, results, and reports.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`${basePath}/content/media`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Image className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Media Gallery</CardTitle>
                  <CardDescription>
                    Upload and manage photos and media assets.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
