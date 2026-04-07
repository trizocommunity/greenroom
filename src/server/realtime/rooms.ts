export const RealtimeRoom = {
  festivalAll(festivalId: string) {
    return `festival:${festivalId}:all`;
  },
  festivalRole(festivalId: string, role: string) {
    return `festival:${festivalId}:role:${role}`;
  },
  festivalStudent(festivalId: string, studentId: string) {
    return `festival:${festivalId}:student:${studentId}`;
  },
  judgementProgramme(festivalId: string, programmeId: string) {
    return `festival:${festivalId}:programme:${programmeId}:judgment`;
  },
  reportingSession(festivalId: string, reportingSessionId: string) {
    return `festival:${festivalId}:reporting:${reportingSessionId}`;
  },
  publicStandings(festivalId: string) {
    return `festival:${festivalId}:public:standings`;
  },
};

export function parseFestivalIdFromRoom(room: string): string | null {
  const parts = room.split(":");
  if (parts.length < 2) return null;
  if (parts[0] !== "festival") return null;
  return parts[1] ?? null;
}
