import { findFestivalById } from "@/server/models/festival.model";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { EditionStatusBadge } from "@/components/festival/EditionStatusBadge";
import { format } from "date-fns";

export default async function EditionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalId } = await params;
  const festival = await findFestivalById(festivalId);

  if (!festival) {
    notFound();
  }

  // Sort editions by number desc
  const editions = festival.editions.sort((a, b) => b.number - a.number);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Editions</h2>
          <p className="text-muted-foreground">
            Manage your festival editions here.
          </p>
        </div>
        <Button asChild>
          <Link href={`/festival/${festival.id}/dashboard/editions/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Create Edition
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {editions.map((edition) => (
          <Card key={edition.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {edition.name || `Edition ${edition.number}`}
              </CardTitle>
              <EditionStatusBadge status={edition.status} size="sm" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Edition {edition.number}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(edition.startDate), "MMM d, yyyy")} -{" "}
                {format(new Date(edition.endDate), "MMM d, yyyy")}
              </p>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/festival/${festival.id}/dashboard/editions/${edition.id}`}
                  >
                    Manage
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {editions.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            No editions found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
