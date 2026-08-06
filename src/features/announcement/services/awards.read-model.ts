import { getParticipantTopScorers } from "@/features/announcement/services/participant-top-scorers.read-model";

export async function getVocalOfTheFest(festivalId: string) {
  const scorers = await getParticipantTopScorers(festivalId);
  const sortedByStage = scorers
    .filter((s) => s.stagePoints > 0)
    .sort((a, b) => b.stagePoints - a.stagePoints);
  return sortedByStage[0] ?? null;
}

export async function getPenOfTheFest(festivalId: string) {
  const scorers = await getParticipantTopScorers(festivalId);
  const sortedByOffstage = scorers
    .filter((s) => s.offstagePoints > 0)
    .sort((a, b) => b.offstagePoints - a.offstagePoints);
  return sortedByOffstage[0] ?? null;
}
