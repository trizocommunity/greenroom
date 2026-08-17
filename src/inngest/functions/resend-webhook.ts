import { getRedis } from "@/core/redis/client";
import { keys } from "@/core/redis/keys";
import { EmailPreferencesService } from "@/features/email-preferences/services/email-preferences.service";
import { inngest } from "@/inngest/client";

/**
 * Resend webhook consumer (UC11).
 *
 * Triggered by `resend.webhook` events. Deduplicates Resend deliveries
 * within 7 days via `dedupe` config. Handles four event types:
 *
 *   - email.delivered   → log only
 *   - email.bounced     → publish to `greenroom:email:bounce` so the
 *                          email-prefs cache and admin alert subscribers
 *                          can react (UC18)
 *   - email.complained  → same as bounce; auto-disable the user
 *   - email.opened      → log only (no consumer today)
 *
 * Concurrency: 3. Retry: 5 attempts with exponential backoff.
 */
export const resendWebhook = inngest.createFunction(
  {
    id: "resend-webhook",
    name: "Resend webhook",
    concurrency: { limit: 3 },
    retries: 5,
    triggers: [{ event: "resend.webhook" }],
    idempotency: "event.data.eventId",
  },
  async ({ event, step }) => {
    const { eventId, payload } = event.data as {
      eventId: string;
      payload: Record<string, unknown>;
    };

    const eventType = (payload.type ?? payload.event_type) as
      | string
      | undefined;
    const recipient = (payload.to ?? payload.recipient) as
      | string[]
      | string
      | undefined;
    const recipientEmail = Array.isArray(recipient) ? recipient[0] : recipient;

    if (!eventType) {
      return { skipped: true, reason: "missing event type", eventId };
    }

    if (eventType === "email.bounced" || eventType === "email.complained") {
      await step.run("auto-disable-prefs", async () => {
        if (!recipientEmail) return { skipped: "no recipient" };
        const tags =
          (payload as { tags?: Array<{ name?: string; value?: string }> })
            .tags ?? [];
        const kind = tags.find((t) => t?.name === "kind")?.value ?? null;
        if (typeof kind === "string") {
          await EmailPreferencesService.setEnabled(
            kind as Parameters<typeof EmailPreferencesService.setEnabled>[0],
            false,
          );
        }
        return { disabled: true, recipient: recipientEmail, kind };
      });

      await step.run("publish-bounce", async () => {
        await getRedis().publish(
          keys.emailBounceChannel(),
          JSON.stringify({
            eventId,
            type: eventType,
            recipient: recipientEmail,
            occurredAt: new Date().toISOString(),
          }),
        );
      });
    }

    return { ok: true, eventId, eventType };
  },
);
