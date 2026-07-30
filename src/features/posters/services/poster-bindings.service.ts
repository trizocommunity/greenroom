import type { PosterEditorDocument } from "@/components/editor/poster-editor-types";

export type PosterBindings = Record<string, string>;

export interface ResultPosterBindingInput {
  festivalName: string;
  programmeName: string;
  categoryName: string;
  /** Programme code letter (e.g. spin-wheel code) shown as result number on poster. */
  programmeResultCode?: string | null;
  winners: Array<{
    position: number;
    name: string;
    team: string;
    grade: string | null;
    points: number;
  }>;
}

/** Maps domain data to editor binding keys (festName, winnerName, …). */
export function buildResultPosterBindings(
  input: ResultPosterBindingInput,
): PosterBindings {
  const bindings: PosterBindings = {
    festName: input.festivalName,
    categoryName: input.categoryName,
    programmeName: input.programmeName,
    resultLabel: "Results",
    resultNo:
      input.programmeResultCode?.trim() ||
      String(input.winners[0]?.position ?? ""),
  };

  const sorted = [...input.winners].sort((a, b) => a.position - b.position);
  sorted.forEach((w, i) => {
    const n = i + 1;
    bindings[`winner${n}Name`] = w.name;
    bindings[`winner${n}Team`] = w.team;
    bindings[`winner${n}Grade`] = w.grade ?? "—";
    bindings[`winner${n}Points`] = String(w.points);
    if (n === 1) {
      bindings.winnerName = w.name;
      bindings.placeName = w.team;
      bindings.teamName = w.team;
    }
  });

  return bindings;
}

export function buildTeamPointsBindings(input: {
  festivalName: string;
  generatedAt: string;
  teams: Array<{ rank: number; name: string; points: number }>;
}): PosterBindings {
  const bindings: PosterBindings = {
    festName: input.festivalName,
    festDate: input.generatedAt,
    teamRank: "1",
    teamName: input.teams[0]?.name ?? "",
    teamPoints: String(input.teams[0]?.points ?? 0),
  };
  input.teams.slice(0, 12).forEach((t, i) => {
    const n = i + 1;
    bindings[`team${n}Rank`] = String(t.rank);
    bindings[`team${n}Name`] = t.name;
    bindings[`team${n}Points`] = String(t.points);
  });
  return bindings;
}

export function buildCandidateCardBindings(input: {
  festivalName: string;
  participantName: string;
  chestNumber: string;
  teamName: string;
  qrPayload: string;
  categoryName?: string;
}): PosterBindings {
  return {
    festName: input.festivalName,
    categoryName: input.categoryName ?? "—",
    participantName: input.participantName,
    chestNumber: input.chestNumber,
    teamName: input.teamName,
    placeName: input.teamName,
    qrCode: input.qrPayload,
  };
}

export function resolveBindingText(
  bindingKey: string | undefined,
  bindings: PosterBindings,
  fallback: string,
): string {
  if (!bindingKey) return fallback;
  return (
    bindings[bindingKey] ?? bindings[bindingKey.replace(/_/g, "")] ?? fallback
  );
}

export function documentWithBindings(
  doc: PosterEditorDocument,
  bindings: PosterBindings,
  preview: boolean,
): PosterEditorDocument {
  if (!preview) return doc;
  return {
    ...doc,
    elements: doc.elements.map((el) => {
      if (el.type === "text" && el.bindingKey) {
        return {
          ...el,
          text: resolveBindingText(el.bindingKey, bindings, el.text ?? ""),
        };
      }
      if (el.type === "qr" && el.bindingKey) {
        return { ...el, text: bindings.qrCode ?? "QR" };
      }
      return el;
    }),
  };
}
