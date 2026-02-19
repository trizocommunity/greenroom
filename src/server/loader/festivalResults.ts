import { prisma } from "@/lib/db";

export interface PublicResult {
  id: string;
  programmeId: string;
  programName: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  category: string;
  winner: string;
  team: string;
  position: number;
  points: number;
  score?: number;
  grade?: string | null;
}

/**
 * Fetch published results for a festival (public site)
 */
export async function getPublicFestivalResults(
  festivalId: string,
): Promise<PublicResult[]> {
  const results = await prisma.result.findMany({
    where: {
      festivalId,
      isPublished: true,
    },
    include: {
      programme: {
        include: {
          category: true,
        },
      },
      assignment: {
        include: {
          student: true,
          group: true,
        },
      },
    },
    orderBy: [{ programme: { name: "asc" } }, { position: "asc" }],
  });

  // Group results by programme to handle GROUP type aggregation
  const resultsByProgramme = results.reduce(
    (acc, result) => {
      const progId = result.programme.id;
      if (!acc[progId]) {
        acc[progId] = [];
      }
      acc[progId].push(result);
      return acc;
    },
    {} as Record<string, typeof results>,
  );

  const finalResults: PublicResult[] = [];

  // Process each programme
  Object.values(resultsByProgramme).forEach((programmeResults) => {
    if (programmeResults.length === 0) return;

    const programme = programmeResults[0].programme;

    if (programme.type === "GROUP") {
      // For GROUP programmes, aggregate by team (group + teamNumber)
      const teamMap = new Map<
        string,
        {
          teamId: string;
          teamName: string;
          group: string;
          position: number;
          points: number;
          score: number;
          grade: string | null;
        }
      >();

      programmeResults.forEach((result) => {
        const teamId = `${result.assignment.group?.id || "unknown"}-${result.assignment.teamNumber || 1}`;

        if (!teamMap.has(teamId)) {
          const teamName =
            result.assignment.group?.name +
            (result.assignment.teamNumber > 1
              ? ` Team ${result.assignment.teamNumber}`
              : "");

          teamMap.set(teamId, {
            teamId: result.id, // Use first result ID
            teamName: teamName || "Unknown Team",
            group: result.assignment.group?.name || "N/A",
            position: result.position || 999,
            points: result.points,
            score: result.score,
            grade: result.grade,
          });
        }
      });

      // Add team results
      teamMap.forEach((teamResult) => {
        finalResults.push({
          id: teamResult.teamId,
          programmeId: programme.id,
          programName: programme.name,
          programmeType: "GROUP",
          category: programme.category.name,
          winner: teamResult.teamName,
          team: teamResult.group,
          position: teamResult.position,
          points: teamResult.points,
          score: teamResult.score,
          grade: teamResult.grade,
        });
      });
    } else {
      // For INDIVIDUAL programmes, show each student
      programmeResults.forEach((result) => {
        finalResults.push({
          id: result.id,
          programmeId: programme.id,
          programName: programme.name,
          programmeType: "INDIVIDUAL",
          category: programme.category.name,
          winner: result.assignment.student?.name || "Unknown",
          team: result.assignment.group?.name || "N/A",
          position: result.position || 999,
          points: result.points,
          score: result.score,
          grade: result.grade,
        });
      });
    }
  });

  return finalResults.sort((a, b) => {
    // Sort by programme name, then position
    if (a.programName !== b.programName) {
      return a.programName.localeCompare(b.programName);
    }
    return a.position - b.position;
  });
}
