# Data-Layer Integration Test Infrastructure

## Status
- **Created**: 2026-08-04
- **Status**: Draft
- **Priority**: High
- **Complexity**: Medium
- **Blocks**: ISSUE-programme-assignment-shape-abstraction, ISSUE-bulk-write-and-cache-refresh-contract, ISSUE-creator-column-schema-consistency. Any future refactor that touches the data layer or transaction boundaries.

## Summary

Add a real PostgreSQL integration test suite alongside the existing unit suite. The unit suite mocks Drizzle chains and never exercises a real DB; the bugs in the surrounding issues (GROUP vs INDIVIDUAL join shape, partial-success bulk insert, quota races, creator-column backfill) would have been caught by even a basic integration test. Today there is no test database bootstrap, no fixture for GROUP/INDIVIDUAL assignment shapes, and no transactional rollback harness. The fix adds a second Vitest project (`integration`), a `testcontainers`-managed Postgres per run, a `withTransaction` helper that rolls back after every test, and a `buildFestivalWithBothShapes` fixture that models the XOR invariant between `programme_assignment.participantId` and `programme_assignment_member.participantId`.

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Test runner | Vitest with two projects: `unit` (existing, mocked DB) and `integration` (new, real DB) |
| 2 | DB provisioning | `@testcontainers/postgresql` (per-run ephemeral PostgreSQL container) |
| 3 | DB lifecycle | Container started once per test file; migrations pushed on startup; each test runs inside a transaction that is rolled back at the end |
| 4 | Test DB isolation | Transactional rollback per test (no schema reset between tests) |
| 5 | Fixture location | `src/test/integration/fixtures/` |
| 6 | Coverage target | Every service that touches `programme_assignment`, `programme_assignment_member`, or runs a multi-row write inside a transaction |
| 7 | CI | Integration tests run on PR; failure fails CI |
| 8 | Local dev | `pnpm test:integration` requires Docker. Local devs without Docker fall back to `pnpm test:unit` only |
| 9 | Mocked DB stays | Yes — unit suite remains mocked. Integration suite is additive, not replacement |
| 10 | Coverage tool | Existing V8 coverage; integration tests count for coverage |
| 11 | Schema push strategy | `drizzle-kit push` directly (faster than migrations for tests; tests don't need migration history) |
| 12 | Container image | `postgres:16-alpine` |
| 13 | Pool | `pool: "forks"` — each test file in its own Node process to avoid shared module-state between tests |

## Problem Statement

1. **No real-DB tests today.** `src/test/setup.ts` only mocks `server-only` and `resend`. The `DATABASE_URL` env var in setup is never connected to anything.
2. **No fixture data for the GROUP/INDIVIDUAL XOR invariant.** Development seed (`scripts/seed/programmes.ts:50-90`) creates programme rows but never creates `programme_assignment` or `programme_assignment_member` rows. Anyone wanting to test the shape must hand-roll the data per test.
3. **No transactional rollback harness.** Every test that wanted to test a multi-row write had to mock Drizzle and assert on call args; partial-success and rollback behavior was untestable.
4. **Quota races untestable.** Two concurrent `bulkCreateParticipantsAction` calls cannot be exercised without a real DB.
5. **GROUP/INDIVIDUAL fan-out untestable.** `AssignmentService.getAll` synthesizes one row per GROUP member via spread + `programme_assignment_member` join. The shape is asserted in unit tests via mocks, but the actual SQL output (and ordering, and JOIN cardinality) is not.
6. **The 8 tactical bugs surfaced in the last sprint would all have been caught by even a basic integration test.** The pattern is "developers can't run the GROUP/INDIVIDUAL JOIN shape end-to-end, so they hand-write the wrong JOIN each time."

## Out of Scope

- E2E tests (Playwright/Cypress). The integration suite exercises services directly via vitest, not through the browser.
- Performance/load testing. Integration tests verify correctness, not throughput.
- Migration of existing unit tests to integration. The unit suite stays as-is.
- Snapshot testing of generated SQL.
- Test data anonymization tooling.
- Cross-database compatibility (only PostgreSQL).
- Changing the development seed to also create assignments (kept separate from fixtures).

## Solution

### 1. Vitest two-project config

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/test/integration/**", "node_modules/**"],
          environment: "node",
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["src/test/integration/**/*.test.ts"],
          exclude: ["node_modules/**"],
          environment: "node",
          setupFiles: ["./src/test/integration/setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          pool: "forks",
          poolOptions: { forks: { singleFork: false } },
        },
      },
    ],
  },
});
```

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run --project unit",
    "test:integration": "vitest run --project integration",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@testcontainers/postgresql": "^10.13.0"
  }
}
```

### 2. Integration setup file

`src/test/integration/setup.ts`:

```ts
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { execSync } from "child_process";
import { afterAll, beforeAll } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/core/database/schema";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

export function getDb() { return db; }

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("greenroom_test")
    .withUsername("test")
    .withPassword("test")
    .start();

  const url = container.getConnectionUri();
  client = postgres(url, { max: 5 });
  db = drizzle(client, { schema });

  execSync("pnpm exec drizzle-kit push --config=drizzle.config.ts", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
}, 60_000);

afterAll(async () => {
  await client?.end();
  await container?.stop();
});
```

### 3. Transactional rollback per test

`src/test/integration/with-transaction.ts`:

```ts
import { getDb } from "./setup";

export async function withTransaction(
  fn: (tx: ReturnType<typeof getDb>) => Promise<void>,
) {
  await getDb().transaction(async (tx) => {
    try {
      await fn(tx);
    } finally {
      // throw inside the callback to roll back
      throw new Error("__rollback__");
    }
  }).catch((e) => {
    if (e instanceof Error && e.message !== "__rollback__") throw e;
  });
}
```

Where a service exposes a transaction-aware path (i.e. accepts an explicit `tx` parameter), tests pass it in. Where the service uses the global `db`, the rollback still works because every write inside `db.transaction` is reverted at the rollback point. Services that need transaction awareness for testing are updated as part of Issue B (e.g. `ParticipantService.create` accepts an optional `tx`).

### 4. Fixtures

`src/test/integration/fixtures/festival.ts`:

```ts
import { randomUUID } from "crypto";
import {
  category,
  festival as festivalTable,
  group as groupTable,
  participant as participantTable,
  programme as programmeTable,
  user as userTable,
  programmeAssignment,
  programmeAssignmentMember,
} from "@/core/database/schema";
import type { getDb } from "../setup";

export type FestivalFixture = Awaited<ReturnType<typeof buildFestivalWithBothShapes>>;

export async function buildFestivalWithBothShapes(
  tx: ReturnType<typeof getDb>,
  opts: { tier?: "BASIC" | "STANDARD" | "PRO"; festivalName?: string } = {},
) {
  const tier = opts.tier ?? "BASIC";

  // 1. Owner
  const owner = (await tx.insert(userTable).values({
    id: randomUUID(),
    email: `owner-${randomUUID()}@test.local`,
    fullName: "Test Owner",
    displayName: "Test Owner",
    accountType: "PERSONAL",
  }).returning())[0];

  // 2. Festival
  const festival = (await tx.insert(festivalTable).values({
    id: randomUUID(),
    ownerId: owner.id,
    name: opts.festivalName ?? "Test Festival",
    slug: `test-${randomUUID().slice(0, 8)}`,
    tier,
    status: "READY",
  }).returning())[0];

  // 3. 2 categories (one for each programme type)
  const categories = await tx.insert(category).values([
    { id: randomUUID(), festivalId: festival.id, name: "Cat Individual", type: "INDIVIDUAL" },
    { id: randomUUID(), festivalId: festival.id, name: "Cat Group", type: "GROUP" },
  ]).returning();

  // 4. 2 groups
  const groups = await tx.insert(groupTable).values([
    { id: randomUUID(), festivalId: festival.id, name: "Group A", color: "#ff0000" },
    { id: randomUUID(), festivalId: festival.id, name: "Group B", color: "#00ff00" },
  ]).returning();

  // 5. 4 participants (2 per group, 1 per category)
  const participants = await tx.insert(participantTable).values([
    { id: randomUUID(), festivalId: festival.id, groupId: groups[0].id, categoryId: categories[0].id, name: "Alice A", dateOfBirth: "2000-01-01", profileSlug: `alice-a-${randomUUID().slice(0, 6)}` },
    { id: randomUUID(), festivalId: festival.id, groupId: groups[0].id, categoryId: categories[1].id, name: "Bob A",   dateOfBirth: "2000-01-01", profileSlug: `bob-a-${randomUUID().slice(0, 6)}` },
    { id: randomUUID(), festivalId: festival.id, groupId: groups[1].id, categoryId: categories[0].id, name: "Alice B", dateOfBirth: "2000-01-01", profileSlug: `alice-b-${randomUUID().slice(0, 6)}` },
    { id: randomUUID(), festivalId: festival.id, groupId: groups[1].id, categoryId: categories[1].id, name: "Bob B",   dateOfBirth: "2000-01-01", profileSlug: `bob-b-${randomUUID().slice(0, 6)}` },
  ]).returning();

  // 6. 2 programmes (one INDIVIDUAL, one GROUP)
  const programmes = await tx.insert(programmeTable).values([
    { id: randomUUID(), festivalId: festival.id, categoryId: categories[0].id, name: "Solo", type: "INDIVIDUAL", stageType: "STAGE", maxParticipantsPerGroup: 2 },
    { id: randomUUID(), festivalId: festival.id, categoryId: categories[1].id, name: "Team", type: "GROUP",     stageType: "STAGE", maxTeamsPerGroup: 1, maxParticipantsPerTeam: 2 },
  ]).returning();

  return { owner, festival, categories, groups, participants, programmes };
}

export async function seedIndividualAssignment(
  tx: ReturnType<typeof getDb>,
  args: { festivalId: string; programmeId: string; participantId: string },
) {
  const a = (await tx.insert(programmeAssignment).values({
    id: randomUUID(),
    festivalId: args.festivalId,
    programmeId: args.programmeId,
    participantId: args.participantId,
    teamNumber: 1,
  }).returning())[0];
  return a;
}

export async function seedGroupAssignment(
  tx: ReturnType<typeof getDb>,
  args: { festivalId: string; programmeId: string; groupId: string; memberIds: string[]; teamNumber?: number },
) {
  const a = (await tx.insert(programmeAssignment).values({
    id: randomUUID(),
    festivalId: args.festivalId,
    programmeId: args.programmeId,
    groupId: args.groupId,
    teamNumber: args.teamNumber ?? 1,
  }).returning())[0];

  await tx.insert(programmeAssignmentMember).values(
    args.memberIds.map((participantId) => ({
      id: randomUUID(),
      festivalId: args.festivalId,
      assignmentId: a.id,
      participantId,
    })),
  );
  return a;
}
```

### 5. Required tests for the other 3 issues to land safely

`src/test/integration/programme-membership.test.ts` (covers Issue A):
- `getProgrammesForParticipant` returns INDIVIDUAL assignment for an INDIVIDUAL-only participant
- `getProgrammesForParticipant` returns GROUP assignment (with `memberId` set, `groupId` set, `teamNumber` set) for a member of a GROUP team
- `getProgrammesForParticipant` returns both for a participant in both shapes
- `getProgrammesForParticipant` returns empty for a participant in no programmes
- `getParticipantsForProgramme` returns the INDIVIDUAL participant directly
- `getParticipantsForProgramme` returns GROUP members (not the GROUP row's `participantId` — there is none)
- `getParticipantsForProgramme` returns empty for a programme with no assignments
- `getProgrammesForParticipant` is scoped to `festivalId` (cross-festival leakage prevention)

`src/test/integration/bulk-create-participants.test.ts` (covers Issue B):
- Bulk of 100 succeeds, all 100 inserted with chest numbers
- Row 50 of 100 has a duplicate name → 99 inserted, 1 error, chest numbers assigned to 99
- Row 50 of 100 has an invalid group ID → 99 inserted, 1 error
- Batch over tier limit (BASIC = 250) → whole batch rejected up front, no partial insert
- Concurrent batches of 100 each (total 200 on a fresh BASIC festival) → both succeed; quota enforced
- On row failure mid-batch, usage counter matches `successCount` not `participants.length`

`src/test/integration/bulk-create-programmes.test.ts` (covers Issue B):
- Bulk of 50 succeeds, all 50 inserted
- >1000 → rejected by zod cap before any insert
- Empty array → rejected (zod `.min(1)`)
- Duplicate within batch (`name + categoryId + type` repeats) → all-or-nothing rejects entire batch
- Usage counter consistent after success
- Usage counter rolled back on insert failure

`src/test/integration/creator-columns.test.ts` (covers Issue C):
- `createStage` writes `createdByName` and `createdByEmail`, not just `createdBy`
- After migration backfill script runs, every existing stage has `createdByName` populated
- Backfill query correctly resolves `createdByName` from `user.displayName ?? user.fullName ?? user.email`
- Off-stage provisioner writes `createdByName: "System"` (literal) and `createdByEmail: null`

### 6. CI

`.github/workflows/ci.yml` (or equivalent CI config):
- Add `pnpm test:integration` to the test job
- Cache `postgres:16-alpine` Docker image
- Fail PR on integration failure
- Set `DOCKER_HOST` if running on GitHub Actions runners

## Phased Implementation Order

| # | Phase | Deliverable | Verify |
|---|---|---|---|
| D.1 | Vitest two-project config | `vitest.config.ts` has `unit` + `integration` projects; new `test:unit` and `test:integration` scripts | `pnpm test:unit` passes; `pnpm test:integration` runs (even with 0 tests) |
| D.2 | Testcontainer setup | `src/test/integration/setup.ts` spins Postgres, pushes schema, exposes `getDb()` | Dummy insert/read test passes |
| D.3 | `withTransaction` helper | `src/test/integration/with-transaction.ts` | Test confirms data inserted inside helper is invisible to the next test |
| D.4 | Festival fixture | `src/test/integration/fixtures/festival.ts` with both shapes | `buildFestivalWithBothShapes` produces a queryable tree |
| D.5 | `programme-membership.test.ts` | Issue A coverage | CI green |
| D.6 | `bulk-create-participants.test.ts` + `bulk-create-programmes.test.ts` | Issue B coverage | CI green |
| D.7 | `creator-columns.test.ts` | Issue C coverage | CI green |
| D.8 | CI integration | `pnpm test:integration` runs on PR | Green on a no-op PR |

## Files Touched

**New**
- `src/test/integration/setup.ts`
- `src/test/integration/with-transaction.ts`
- `src/test/integration/fixtures/festival.ts`
- `src/test/integration/programme-membership.test.ts`
- `src/test/integration/bulk-create-participants.test.ts`
- `src/test/integration/bulk-create-programmes.test.ts`
- `src/test/integration/creator-columns.test.ts`

**Modified**
- `vitest.config.ts` (two projects)
- `package.json` (`test:unit`, `test:integration`, add `@testcontainers/postgresql` devDep)
- `.github/workflows/ci.yml` (or equivalent CI config)

## Verification

- `pnpm test:unit` — passes (no regression in existing tests)
- `pnpm test:integration` — passes (new tests run against ephemeral Postgres)
- CI: both jobs green on PR
- Coverage report includes the new integration tests
- Manual: a developer without Docker can still run `pnpm test:unit` and the existing test suite passes

## Out-of-Scope Notes

- The dev seed (`scripts/seed/programmes.ts`) does NOT create assignment rows today. We deliberately do not change the dev seed in this issue; the integration fixture is the source of truth for tests, not the seed.
- We do not migrate the existing unit tests to integration. The unit suite stays mocked.
- We do not introduce snapshot testing or schema-diff assertions.
- We do not add cross-database compatibility. Postgres-only.
