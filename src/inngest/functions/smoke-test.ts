import { inngest } from "@/inngest/client";

/**
 * Smoke-test function: verifies the Inngest webhook is reachable and the
 * SDK is wired correctly. Remove before production — it sends a synthetic
 * event every five minutes.
 */
export const smokeTest = inngest.createFunction(
  {
    id: "smoke-test",
    name: "Smoke test",
    triggers: [{ event: "greenroom/smoke.test" }],
  },
  async ({ event, step }) => {
    await step.run("echo", async () => ({
      received: event.name,
      ts: Date.now(),
    }));
    return { ok: true };
  },
);
