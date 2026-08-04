import "server-only";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import { systemConfig } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import {
  EMAIL_KINDS,
  type EmailKindName,
} from "@/core/integrations/email/types";

/**
 * Per-kind global on/off toggle for outbound transactional emails.
 *
 * Backed by `system_config` (no schema migration). Super-admin can flip
 * each kind from the email-settings page; `sendEmail` checks the toggle
 * before handing off to Resend.
 *
 * Default for every kind is `enabled: true` if no row exists — fresh
 * installs behave the same as before the toggle layer was added.
 */

const KEY_PREFIX = "email:kind:";

function configKey(kind: EmailKindName): string {
  return `${KEY_PREFIX}${kind}`;
}

type EmailKindConfig = { enabled: boolean };

function isEmailKindConfig(value: unknown): value is EmailKindConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.enabled === "boolean";
}

export const EmailPreferencesService = {
  /**
   * On/off map for every email kind. Missing rows default to `true`.
   */
  async getAll(): Promise<Record<EmailKindName, boolean>> {
    const rows = await db
      .select({ key: systemConfig.key, value: systemConfig.value })
      .from(systemConfig)
      .where(inArray(systemConfig.key, EMAIL_KINDS.map(configKey)));

    const map: Partial<Record<EmailKindName, boolean>> = {};
    for (const row of rows) {
      const kind = row.key.startsWith(KEY_PREFIX)
        ? (row.key.slice(KEY_PREFIX.length) as EmailKindName)
        : null;
      if (!kind || !EMAIL_KINDS.includes(kind)) continue;
      if (isEmailKindConfig(row.value)) {
        map[kind] = row.value.enabled;
      }
    }

    return Object.fromEntries(
      EMAIL_KINDS.map((k) => [k, map[k] ?? true]),
    ) as Record<EmailKindName, boolean>;
  },

  async isEnabled(kind: EmailKindName): Promise<boolean> {
    const row = await db.query.systemConfig.findFirst({
      where: eq(systemConfig.key, configKey(kind)),
    });
    const value = row?.value;
    if (isEmailKindConfig(value)) return value.enabled;
    return true;
  },

  async setEnabled(kind: EmailKindName, enabled: boolean): Promise<void> {
    const now = serverNowIso();
    await db
      .insert(systemConfig)
      .values({
        id: randomUUID(),
        key: configKey(kind),
        value: { enabled },
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: systemConfig.key,
        set: { value: { enabled }, updatedAt: now },
      });
  },
};
