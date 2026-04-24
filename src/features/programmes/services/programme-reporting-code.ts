/** Resolve a student's code from a session's code letters (multi-letter + legacy single-letter). */

export type CodeLetterWithRecipients = {
  code: string;
  programmeCodeLetterRecipients: Array<{ studentId: string }>;
};

export function getCodeForStudentFromLetters(
  letters: CodeLetterWithRecipients[] | undefined | null,
  studentId: string | null | undefined,
): string | null {
  if (!letters?.length || !studentId) return null;
  for (const letter of letters) {
    if (
      letter.programmeCodeLetterRecipients?.some(
        (r) => r.studentId === studentId,
      )
    ) {
      return letter.code;
    }
  }
  return null;
}
