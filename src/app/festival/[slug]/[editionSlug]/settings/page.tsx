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
import { EditionSettingsForm } from "@/components/festival/edition/EditionSettingsForm";

export default async function EditionSettingsPage({
  params,
}: {
  params: Promise<{ slug: string; editionSlug: string }>;
}) {
  const { slug: festivalSlug, editionSlug } = await params;
  const festival = await findFestivalBySlugOrId(festivalSlug);

  if (!festival) notFound();

  const edition = festival.editions.find((e) => e.slug === editionSlug);
  if (!edition) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Edition Settings</h3>
        <p className="text-muted-foreground">
          Manage configuration for {edition.name || edition.slug}.
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>Basic details about this edition.</CardDescription>
        </CardHeader>
        <CardContent>
          <EditionSettingsForm edition={edition} festivalSlug={festivalSlug} />
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/20">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-600/80 dark:text-red-400/80">
            Irreversible actions for this edition.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive">Archive Edition</Button>
        </CardContent>
      </Card>
    </div>
  );
}
