import { and, asc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { result as resultTable } from "@/core/database/schema";

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
  grade?: string | null;
  codeLetter?: string | null;
}

const getResultPoints = (result: {
  points?: number;
  awardPoints?: number | null;
}) => result.awardPoints ?? result.points ?? 0;

/**
 * Fetch published results for a festival (public site)
 */
export async function getPublicFestivalResults(
  festivalId: string,
): Promise<PublicResult[]> {
  const results = await db.query.result.findMany({
    where: and(
      eq(resultTable.festivalId, festivalId),
      eq(resultTable.isPublished, true),
    ),
    with: {
      programme: {
        with: {
          category: true,
        },
      },
      programmeAssignment: {
        with: {
          student: true,
          group: true,
        },
      },
    },
  });

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

  Object.values(resultsByProgramme).forEach((programmeResults) => {
    if (programmeResults.length === 0) return;

    const programme = programmeResults[0].programme;

    if (programme.type === "GROUP") {
      const teamMap = new Map<
        string,
        {
          teamId: string;
          teamName: string;
          group: string;
          position: number;
          points: number;
          grade: string | null;
        }
      >();

      programmeResults.forEach((result: any) => {
        const teamId = `${result.programmeAssignment.group?.id || "unknown"}-${result.programmeAssignment.teamNumber || 1}`;

        if (!teamMap.has(teamId)) {
          const teamName =
            (result.programmeAssignment.group?.name ?? "") +
            (result.programmeAssignment.teamNumber > 1
              ? ` Team ${result.programmeAssignment.teamNumber}`
              : "");

          teamMap.set(teamId, {
            teamId: result.id,
            teamName: teamName || "Unknown Team",
            group: result.programmeAssignment.group?.name || "N/A",
            position: result.position || 999,
            points: getResultPoints(result),
            grade: result.grade,
          });
        }
      });

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
          grade: teamResult.grade,
          codeLetter: null,
        });
      });
    } else {
      programmeResults.forEach((result: any) => {
        finalResults.push({
          id: result.id,
          programmeId: programme.id,
          programName: programme.name,
          programmeType: "INDIVIDUAL",
          category: programme.category.name,
          winner: result.programmeAssignment.student?.name || "Unknown",
          team: result.programmeAssignment.group?.name || "N/A",
          position: result.position || 999,
          points: getResultPoints(result),
          grade: result.grade,
          codeLetter: null,
        });
      });
    }
  });

  return finalResults.sort((a, b) => {
    if (a.programName !== b.programName) {
      return a.programName.localeCompare(b.programName);
    }
    return a.position - b.position;
  });
}
