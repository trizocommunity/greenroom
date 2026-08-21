import { ok } from "@/api/lib/response";
import { getRedis } from "@/core/redis/client";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const startedAt = Date.now();
  try {
    const reply = await getRedis().ping();
    const latencyMs = Date.now() - startedAt;
    if (reply !== "PONG") {
      return Response.json(
        { ok: false, error: `unexpected ping reply: ${reply}` },
        { status: 503 },
      );
    }
    return ok({ ok: true, latencyMs }, "no-store");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 503 });
  }
}
