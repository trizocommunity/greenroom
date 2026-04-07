import type { RealtimePrincipal } from "@/server/realtime/principal";
import { parseFestivalIdFromRoom } from "@/server/realtime/rooms";

const PRIVILEGED_ROLES = new Set([
  "OWNER",
  "ADMIN",
  "STAGE_MANAGER",
  "SUPER_ADMIN",
]);

export function authorizeRealtimeRoomJoin(
  principal: RealtimePrincipal | null,
  room: string,
): boolean {
  const festivalId = parseFestivalIdFromRoom(room);
  if (!festivalId) return false;

  // Public standings room is intentionally open but still festival-scoped.
  if (room.endsWith(":public:standings")) return true;
  if (!principal) return false;
  if (!principal.festivalIds.includes(festivalId)) return false;

  if (room.includes(":student:")) {
    const studentId = room.split(":student:")[1];
    if (!studentId) return false;
    if (principal.principalType === "team-leader") {
      return principal.studentId === studentId;
    }
    return true;
  }

  if (
    room.includes(":programme:") ||
    room.includes(":reporting:") ||
    room.includes(":role:")
  ) {
    return principal.roles.some((r) => PRIVILEGED_ROLES.has(r));
  }

  return true;
}
