import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  festival as festivalTable,
  institution as institutionTable,
  user as userTable,
} from "@/core/database/schema";
import {
  linkOwnedFestivalsToInstitution,
  resolveInstitutionIdForOwner,
} from "@/features/institutions/services/festival-institution-link.service";
import { buildFestivalWithBothShapes } from "./fixtures/festival";
import { withTransaction } from "./with-transaction";

/**
 * `festival.institutionId` was NULL on every row in production: no code path
 * ever wrote it, and no test ever built an institutional festival, so nothing
 * caught it. These tests cover both directions of the link — at creation and
 * retroactively on upgrade — because a NULL here silently disables the whole
 * custom-domain feature (the UI section never renders and the API 403s).
 */
describe("festival ↔ institution link", () => {
  async function seedInstitutionalOwner(tx: any) {
    const owner = (
      await tx
        .insert(userTable)
        .values({
          id: randomUUID(),
          email: `inst-owner-${randomUUID()}@test.local`,
          fullName: "Institutional Owner",
          displayName: "Institutional Owner",
          accountType: "INSTITUTIONAL",
        })
        .returning()
    )[0];

    const inst = (
      await tx
        .insert(institutionTable)
        .values({
          id: randomUUID(),
          name: "Ahlussuffa",
          type: "COLLEGE",
          ownerId: owner.id,
        })
        .returning()
    )[0];

    await tx
      .update(userTable)
      .set({ institutionId: inst.id })
      .where(eq(userTable.id, owner.id));

    return { owner, institution: inst };
  }

  it("resolveInstitutionIdForOwner returns the owner's institution", () =>
    withTransaction(async (tx) => {
      const { owner, institution } = await seedInstitutionalOwner(tx);

      expect(await resolveInstitutionIdForOwner(owner.id, tx)).toBe(
        institution.id,
      );
    }));

  it("resolveInstitutionIdForOwner returns null for a personal owner", () =>
    withTransaction(async (tx) => {
      // The fixture owner is PERSONAL — a festival they create must stay
      // unlinked rather than borrow someone else's institution.
      const { owner } = await buildFestivalWithBothShapes(tx);

      expect(await resolveInstitutionIdForOwner(owner.id, tx)).toBeNull();
    }));

  it("links a festival at creation time when the owner is institutional", () =>
    withTransaction(async (tx) => {
      const { owner, institution } = await seedInstitutionalOwner(tx);

      const institutionId = await resolveInstitutionIdForOwner(owner.id, tx);
      const created = (
        await tx
          .insert(festivalTable)
          .values({
            id: randomUUID(),
            ownerId: owner.id,
            institutionId,
            name: "Suffa Mehil",
            slug: `suffamehil-${randomUUID().slice(0, 8)}`,
            tier: "PRO",
            status: "READY",
            expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
            scoringSystem: "SCORE_BASED",
            timezone: "Asia/Kolkata",
          })
          .returning()
      )[0];

      expect(created.institutionId).toBe(institution.id);
    }));

  it("upgrade links the owner's existing unlinked festivals", () =>
    withTransaction(async (tx) => {
      // Festival first (account still personal), institution second — the exact
      // order the personal → institutional upgrade has to cope with.
      const { owner, festival } = await buildFestivalWithBothShapes(tx, {
        tier: "PRO",
      });
      expect(festival.institutionId).toBeNull();

      const inst = (
        await tx
          .insert(institutionTable)
          .values({
            id: randomUUID(),
            name: "Late Institution",
            type: "COLLEGE",
            ownerId: owner.id,
          })
          .returning()
      )[0];

      const linked = await linkOwnedFestivalsToInstitution(
        { ownerId: owner.id, institutionId: inst.id },
        tx,
      );
      expect(linked).toBe(1);

      const after = await tx.query.festival.findFirst({
        where: eq(festivalTable.id, festival.id),
      });
      expect(after?.institutionId).toBe(inst.id);
    }));

  it("never re-homes a festival that already belongs to an institution", () =>
    withTransaction(async (tx) => {
      const { owner, institution } = await seedInstitutionalOwner(tx);
      const other = (
        await tx
          .insert(institutionTable)
          .values({
            id: randomUUID(),
            name: "Other Institution",
            type: "SCHOOL",
            ownerId: (
              await tx
                .insert(userTable)
                .values({
                  id: randomUUID(),
                  email: `other-${randomUUID()}@test.local`,
                  fullName: "Other",
                  displayName: "Other",
                })
                .returning()
            )[0].id,
          })
          .returning()
      )[0];

      const festival = (
        await tx
          .insert(festivalTable)
          .values({
            id: randomUUID(),
            ownerId: owner.id,
            institutionId: other.id,
            name: "Already Linked",
            slug: `linked-${randomUUID().slice(0, 8)}`,
            tier: "PRO",
            status: "READY",
            expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
            scoringSystem: "SCORE_BASED",
            timezone: "Asia/Kolkata",
          })
          .returning()
      )[0];

      const linked = await linkOwnedFestivalsToInstitution(
        { ownerId: owner.id, institutionId: institution.id },
        tx,
      );
      expect(linked).toBe(0);

      const after = await tx.query.festival.findFirst({
        where: eq(festivalTable.id, festival.id),
      });
      expect(after?.institutionId).toBe(other.id);
    }));
});
