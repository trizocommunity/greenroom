import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SessionsClient } from "./SessionsClient";

async function getFestivalWithPrograms(slug: string) {
  return prisma.festival.findFirst({
    where: { slug },
    include: {
      programs: {
        orderBy: { name: "asc" },
      },
    },
  });
}

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await getFestivalWithPrograms(slug);
  
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
            Sessions & Programs
          </h1>
          <p className="text-muted-foreground">
            Explore all programs and sessions in this festival
          </p>
        </div>
        
        <SessionsClient 
          programs={festival.programs} 
          accentColor={festival.accentColor}
        />
      </div>
    </div>
  );
}
