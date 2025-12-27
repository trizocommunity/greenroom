import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default async function FestivalSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalSlug } = await params;
  const festival = await findFestivalBySlugOrId(festivalSlug);

  if (!festival) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Festival Settings</h3>
        <p className="text-muted-foreground">
          Manage configuration for {festival.name}.
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>Basic details about this festival.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground p-4 bg-muted/20 rounded">
            Settings Form Placeholder (Implementation Pending Phase 3)
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/20">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-600/80 dark:text-red-400/80">
            Irreversible actions for this festival.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive">Archive Festival</Button>
        </CardContent>
      </Card>
    </div>
  );
}
