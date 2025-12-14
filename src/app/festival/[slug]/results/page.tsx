import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ResultsClient } from "./ResultsClient";

async function getFestivalWithResults(slug: string) {
  return prisma.festival.findFirst({
    where: { slug },
    include: {
      programs: {
        orderBy: { name: "asc" },
      },
      teams: {
        orderBy: { rank: "asc" },
      },
    },
  });
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await getFestivalWithResults(slug);
  
  if (!festival) {
    notFound();
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: festival.accentColor }}
          >
            Results
          </h1>
          <p className="text-muted-foreground">
            View program results and team standings
          </p>
        </div>
        
        <ResultsClient 
          programs={festival.programs} 
          teams={festival.teams}
          accentColor={festival.accentColor}
        />
      </div>
    </div>
  );
}
