import "server-only";

import { cookies } from "next/headers";
import { createProtectedHandler, forbidden, ok } from "@/api/lib";

const TEAM_LEADER_SESSION_COOKIE = "team_leader_session";

const handler = createProtectedHandler({
  async GET() {
    const cookieStore = await cookies();
    const teamLeaderCookie = cookieStore.get(TEAM_LEADER_SESSION_COOKIE)?.value;

    if (!teamLeaderCookie) {
      return forbidden("Team leader access required");
    }

    return ok(
      {
        isTeamLeader: true,
      },
      "public, max-age=30",
    );
  },
});

export const GET = handler;
