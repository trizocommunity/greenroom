import { z } from "zod";
import { createAdminHandler, ok } from "@/api/lib";
import {
  EMAIL_KIND_META,
  EMAIL_KINDS,
  type EmailKindName,
} from "@/core/integrations/email/types";
import { EmailPreferencesService } from "@/features/email-preferences/services/email-preferences.service";

const updateInput = z.object({
  updates: z
    .array(
      z.object({
        kind: z.enum(EMAIL_KINDS),
        enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(EMAIL_KINDS.length),
});

const handler = createAdminHandler({
  async GET() {
    const enabled = await EmailPreferencesService.getAll();
    const items = EMAIL_KINDS.map((kind: EmailKindName) => ({
      kind,
      label: EMAIL_KIND_META[kind].label,
      description: EMAIL_KIND_META[kind].description,
      enabled: enabled[kind],
    }));
    return ok({ items });
  },

  async POST({ request, user }) {
    const body = await request.json();
    const parsed = updateInput.safeParse(body);
    if (!parsed.success) {
      return ok({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      });
    }

    for (const { kind, enabled } of parsed.data.updates) {
      await EmailPreferencesService.setEnabled(kind, enabled);
    }

    console.info("[email-settings] updated", {
      actor: user!.userId,
      updates: parsed.data.updates,
    });

    return ok({ updated: parsed.data.updates.length });
  },
});

export const GET = handler;
export const POST = handler;
