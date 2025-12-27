import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { findFestivalById } from "@/server/models/festival.model";

export default async function AdminFestivalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const festival = await findFestivalById(id);

  if (!festival) {
    notFound();
  }

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
          <p className="text-muted-foreground flex items-center gap-2">
            /{festival.slug}
            <Badge
              variant={festival.status === "ACTIVE" ? "default" : "secondary"}
            >
              {festival.status}
            </Badge>
          </p>
        </div>
        <Button variant="outline" asChild>
          <a
            href={`/${festival.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Public Site
          </a>
        </Button>
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
                {festival.owner.fullName || festival.owner.email}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created At</span>
              <span>{new Date(festival.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span>{festival.category || "-"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">{festival.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tier</span>
              <span className="font-medium">{festival.tier}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
