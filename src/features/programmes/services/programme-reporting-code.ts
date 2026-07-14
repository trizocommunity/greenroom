/** Resolve a student's code from a session's code letters (multi-letter + legacy single-letter). */

export type CodeLetterWithRecipients = {
  code: string;
  programmeCodeLetterRecipients?: Array<{ studentId: string }>;
  /** @deprecated Use programmeCodeLetterRecipients — kept for older call sites */
  recipients?: Array<{ studentId: string }>;
};

function letterRecipients(
  letter: CodeLetterWithRecipients,
): Array<{ studentId: string }> {
  return letter.programmeCodeLetterRecipients ?? letter.recipients ?? [];
}

export function getCodeForStudentFromLetters(
  letters: CodeLetterWithRecipients[] | undefined | null,
  studentId: string | null | undefined,
): string | null {
  if (!letters?.length || !studentId) return null;
  for (const letter of letters) {
    if (letterRecipients(letter).some((r) => r.studentId === studentId)) {
      return letter.code;
    }
  }
  return null;
}

/** Map session code letters for {@link getCodeForStudentFromLetters}. */
export function mapSessionCodeLettersForLookup(
  letters: Array<{
    code: string;
    programmeCodeLetterRecipients: Array<{ studentId: string }>;
  }>,
): CodeLetterWithRecipients[] {
  return letters.map((cl) => ({
    code: cl.code,
    programmeCodeLetterRecipients: cl.programmeCodeLetterRecipients,
  }));
}
