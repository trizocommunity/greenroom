import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Calendar,
  Layers,
  Users,
  Trophy,
  Mic2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { EditionStatusBadge } from "@/components/festival/EditionStatusBadge";
import { Button } from "@/components/ui/button";

export default async function EditionsListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlugOrId(slug);

  if (!festival) notFound();

  const editions = await prisma.edition.findMany({
    where: { festivalId: festival.id },
    orderBy: { number: "desc" },
    include: {
      limits: true,
    },
  });

  // Calculate some aggregate stats for the header
  const totalEditions = editions.length;
  const totalParticipants = editions.reduce(
    (acc, curr) => acc + curr.participantsCount,
    0,
  );

  return (
    <div className="container max-w-6xl py-10 space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Editions History
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            A timeline of all {festival.name} editions. Track growth,
            participation, and results across years.
          </p>
        </div>
        <div className="flex gap-4 p-4 rounded-lg bg-secondary/20 border border-border/50">
          <div className="text-center px-4 border-r border-border/50 last:border-0">
            <div className="text-2xl font-bold">{totalEditions}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Total Editions
            </div>
          </div>
          <div className="text-center px-4">
            <div className="text-2xl font-bold">{totalParticipants}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Participants
            </div>
          </div>
        </div>
      </div>

      {/* Editions Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {editions.map((edition) => (
          <Link
            key={edition.id}
            href={`/festival/${festival.slug}/${edition.slug}`}
            className="group block"
          >
            <Card className="h-full border-border/40 bg-card/50 hover:bg-card/80 hover:border-primary/20 transition-all duration-300 relative overflow-hidden group-hover:shadow-lg group-hover:shadow-primary/5">
              {/* Decorative gradient blob */}
              <div
                className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br -z-10 blur-3xl opacity-10 rounded-full translate-x-10 -translate-y-10 transition-opacity group-hover:opacity-20 ${
                  edition.status === "ACTIVE"
                    ? "from-green-500 to-emerald-700"
                    : "from-blue-500 to-indigo-700"
                }`}
              />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 px-1.5 border-primary/20 bg-primary/5 text-primary"
                      >
                        {edition.tierLabel}
                      </Badge>
                      {edition.status === "ACTIVE" && (
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      )}
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {edition.name || `${edition.number}th Edition`}
                    </CardTitle>
                  </div>
                  <EditionStatusBadge status={edition.status} size="sm" />
                </div>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {format(new Date(edition.startDate), "MMM yyyy")} -{" "}
                    {format(new Date(edition.endDate), "MMM yyyy")}
                  </span>
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-3">
                <div className="grid grid-cols-3 gap-2 py-4 border-y border-border/40">
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-secondary/20">
                    <Users className="w-4 h-4 mb-1 text-muted-foreground text-blue-400" />
                    <span className="text-lg font-bold leading-none">
                      {edition.participantsCount}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase mt-1">
                      People
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-secondary/20">
                    <Mic2 className="w-4 h-4 mb-1 text-muted-foreground text-purple-400" />
                    <span className="text-lg font-bold leading-none">
                      {edition.eventsCount}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase mt-1">
                      Events
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-secondary/20">
                    <Trophy className="w-4 h-4 mb-1 text-muted-foreground text-amber-400" />
                    <span className="text-lg font-bold leading-none">
                      {edition.judgesCount}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase mt-1">
                      Judges
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-3 pb-4">
                <Button
                  variant="ghost"
                  className="w-full text-xs group-hover:bg-primary/10 group-hover:text-primary justify-between"
                >
                  View Dashboard
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardFooter>
            </Card>
          </Link>
        ))}

        {/* Create New Card (Placeholder or Actual Link if allowed) */}
        {editions.length > 0 &&
          editions.every((e) => e.status !== "ACTIVE") && (
            <Card className="h-full border-dashed border-border flex flex-col items-center justify-center p-6 text-center hover:bg-accent/20 transition-colors cursor-pointer min-h-[300px]">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Ready for the next one?
              </h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                Start a new chapter for {festival.name}.
              </p>
              {/* Note: In a real app we might link to creation module or show a button */}
              <Button variant="outline">Create New Edition</Button>
            </Card>
          )}
      </div>

      {editions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border rounded-2xl border-dashed bg-card/30">
          <Layers className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-2xl font-bold tracking-tight">No History Yet</h2>
          <p className="text-muted-foreground mt-2 mb-8 max-w-md text-center">
            Your festival journey starts here. Create your first edition to
            begin building your legacy.
          </p>
          <Button size="lg">Create First Edition</Button>
        </div>
      )}
    </div>
  );
}
