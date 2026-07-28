/** Resolve a participant's code from a session's code letters (multi-letter + legacy single-letter). */

export type CodeLetterWithRecipients = {
  code: string;
  programmeCodeLetterRecipients?: Array<{ participantId: string }>;
  /** @deprecated Use programmeCodeLetterRecipients — kept for older call sites */
  recipients?: Array<{ participantId: string }>;
};

function letterRecipients(
  letter: CodeLetterWithRecipients,
): Array<{ participantId: string }> {
  return letter.programmeCodeLetterRecipients ?? letter.recipients ?? [];
}

export function getCodeForParticipantFromLetters(
  letters: CodeLetterWithRecipients[] | undefined | null,
  participantId: string | null | undefined,
): string | null {
  if (!letters?.length || !participantId) return null;
  for (const letter of letters) {
    if (
      letterRecipients(letter).some((r) => r.participantId === participantId)
    ) {
      return letter.code;
    }
  }
  return null;
}

/** Map session code letters for {@link getCodeForParticipantFromLetters}. */
export function mapSessionCodeLettersForLookup(
  letters: Array<{
    code: string;
    programmeCodeLetterRecipients: Array<{ participantId: string }>;
  }>,
): CodeLetterWithRecipients[] {
  return letters.map((cl) => ({
    code: cl.code,
    programmeCodeLetterRecipients: cl.programmeCodeLetterRecipients,
  }));
}
