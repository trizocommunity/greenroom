import { closeIdleCheckpointSessions } from "@/features/checkpoints/services/checkpoint.service";
import { inngest } from "@/inngest/client";

/**
 * Auto-close idle checkpoint sessions. A scanning session left OPEN with no
 * activity ("no response from camera") for ≥10 minutes is closed so it stops
 * accepting scans and the operator starts a fresh session to resume.
 *
 * Runs every 2 minutes, so a session closes 10–12 minutes after its last scan
 * (or after start, if it was never scanned). Closed sessions are terminal —
 * they are never reopened.
 */
export const checkpointIdleClose = inngest.createFunction(
  {
    id: "checkpoint-idle-close",
    name: "Auto-close idle checkpoint sessions (10 min no scan)",
    triggers: [{ cron: "*/2 * * * *" }],
  },
  async ({ step }) => {
    const result = await step.run("close-idle", () =>
      closeIdleCheckpointSessions(10),
    );
    return result;
  },
);
