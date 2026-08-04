import type { PosterBindings } from "@/features/posters/services/poster-bindings.service";

const RESULT_HINT =
  "Winner and programme names are placeholders until you publish results for at least one item.";

const CANDIDATE_HINT =
  "Candidate details are placeholders until participants have chest numbers in this festival.";

const CERTIFICATE_HINT =
  "Certificate details are placeholders until results are published for at least one item.";

const TEAM_HINT =
  "Team names and points are placeholders until group standings are published.";

export type EditorPreviewBindingsPayload = {
  bindings: PosterBindings;
  usesPlaceholders: boolean;
  hint: string | null;
};

function festMeta(
  festivalName: string,
  festDate: string,
  festLocation: string,
): PosterBindings {
  return {
    festName: festivalName,
    festDate,
    festLocation,
  };
}

/** RESULT poster preview when no published results exist yet. */
export function buildResultPlaceholderBindings(
  festivalName: string,
  festDate: string,
  festLocation: string,
  opts?: { programmeName?: string; categoryName?: string },
): EditorPreviewBindingsPayload {
  return {
    usesPlaceholders: true,
    hint: RESULT_HINT,
    bindings: {
      ...festMeta(festivalName, festDate, festLocation),
      categoryName: opts?.categoryName ?? "Sample category",
      programmeName: opts?.programmeName ?? "Sample programme",
      resultLabel: "Result",
      resultNo: "—",
      winnerName: "Winner name (1st)",
      winner1Name: "Winner name (1st)",
      winner2Name: "Winner name (2nd)",
      winner3Name: "Winner name (3rd)",
      winner1Team: "School / team (1st)",
      winner2Team: "School / team (2nd)",
      winner3Team: "School / team (3rd)",
      placeName: "School / team (1st)",
    },
  };
}

/** Candidate card preview when no participants with chest numbers exist. */
export function buildCandidatePlaceholderBindings(
  festivalName: string,
  festDate: string,
  festLocation: string,
): EditorPreviewBindingsPayload {
  return {
    usesPlaceholders: true,
    hint: CANDIDATE_HINT,
    bindings: {
      ...festMeta(festivalName, festDate, festLocation),
      categoryName: "Sample category",
      participantName: "Candidate name",
      chestNumber: "0000",
      teamName: "Team name",
      placeName: "Team name",
      qrCode: "0000",
    },
  };
}

/** Certificate preview when no published results exist. */
export function buildCertificatePlaceholderBindings(
  festivalName: string,
  festDate: string,
  festLocation: string,
): EditorPreviewBindingsPayload {
  return {
    usesPlaceholders: true,
    hint: CERTIFICATE_HINT,
    bindings: {
      ...festMeta(festivalName, festDate, festLocation),
      certificateTitle: "Certificate of Participation",
      participantName: "Candidate Name",
      programmeName: "Sample programme",
      categoryName: "Sample category",
      placeName: "Sample school",
      resultLabel: "1st Prize",
      chestNumber: "0000",
      teamName: "Team name",
    },
  };
}

/** Team points poster when no published standings (optional real group names, no fake scores). */
export function buildTeamPointsPlaceholderBindings(
  festivalName: string,
  festDate: string,
  festLocation: string,
  groupNames: string[],
): EditorPreviewBindingsPayload {
  const bindings: PosterBindings = {
    ...festMeta(festivalName, festDate, festLocation),
    teamRank: "1",
    teamName: groupNames[0] ?? "Team name (1st)",
    teamPoints: "—",
  };

  const slots = groupNames.length > 0 ? groupNames.slice(0, 12) : [];
  if (slots.length === 0) {
    for (let i = 1; i <= 3; i++) {
      bindings[`team${i}Rank`] = String(i);
      bindings[`team${i}Name`] =
        `Team name (${i === 1 ? "1st" : i === 2 ? "2nd" : "3rd"})`;
      bindings[`team${i}Points`] = "—";
    }
  } else {
    slots.forEach((name, i) => {
      const n = i + 1;
      bindings[`team${n}Rank`] = String(n);
      bindings[`team${n}Name`] = name;
      bindings[`team${n}Points`] = "—";
    });
  }

  return {
    usesPlaceholders: true,
    hint: TEAM_HINT,
    bindings,
  };
}

export function buildRealPreviewPayload(
  bindings: PosterBindings,
): EditorPreviewBindingsPayload {
  return { bindings, usesPlaceholders: false, hint: null };
}
