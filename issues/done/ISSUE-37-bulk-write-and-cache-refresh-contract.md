# Bulk Write Reliability + Write-Path Cache Invalidation Contract

## Status
- **Created**: 2026-08-04
- **Status**: Draft
- **Priority**: High
- **Complexity**: High
- **Blocks**: any UX promise that uploads "just work"; any future write path that needs to render to an RSC page after a mutation. Affects every participant, programme, assignment, group, category, judge, stage, schedule, result, export, member, news, media, profile, and festival write path.

## Summary

The codebase has two materially different bulk-write styles, neither of which is correct: HTTP `/api/v1/participants/bulk` aborts on the first error (rows before succeed, rows after silently dropped, chest numbers never assigned), and `ProgrammeService.bulkCreate` performs a single `db.insert(array)` with no per-batch cap and no transactional quota. Separately, **none of the ~50 API write routes call `revalidatePath`**, leaving every server-rendered page stale after any mutation that goes through an API route. The fix is a documented contract enforced by audit + per-bulk correctness fixes + a mechanical sweep that adds `revalidatePath` to every API write handler.

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Participants bulk entry | Modal calls `bulkCreateParticipantsAction` directly (existing server action), not the HTTP route |
| 2 | Programmes bulk cap | 1000 rows per upload, enforced via `bulkCreateProgrammesInput.max(1000)` |
| 3 | Bulk transaction | Each bulk runs inside `db.transaction(async (tx) => ...)` |
| 4 | Per-row error reporting | Each bulk returns `{ successCount, errors: [{ row, error }, ...] }` |
| 5 | Defence-in-depth | HTTP `/api/v1/participants/bulk` upgraded to also return `{ created, errors }` instead of throwing |
| 6 | Write-path refresh contract | Every write path must call `revalidatePath` for the affected page AND its mutation hook must invalidate the React Query keys for client subscribers |
| 7 | Audit tooling | One-off script `scripts/audit/write-path-refresh.ts` enumerates every write path and reports missing `revalidatePath` / `qc.invalidateQueries` calls |
| 8 | Group update hook bug | Fixed: `useUpdateGroup` destructures `festivalId` from the wrong variable (`api/client/groups.ts`) |
| 9 | Quota races | Transactional bulk insert + atomic usage counter increment inside the same tx |
| 10 | Chest numbers | `assignChestNumberForNewParticipant` runs inside the same tx as the participant insert |
| 11 | UI surface | Bulk-upload completion panel shows `successCount`, `errors`, and a downloadable error list |
| 12 | Documentation | New `src/api/client/README.md` documents the refresh contract |
| 13 | Audit gating | `scripts/audit/write-path-refresh.ts` runs in CI but only as a non-blocking report (does not fail PR); blocking enforcement added in a follow-up once it's stable |
| 14 | Slug generation | `profileSlug` generation runs inside the same tx as the participant insert |
| 15 | `UsageCounterService` shape | Accepts an optional `tx` parameter; falls back to global `db` if not provided |
| 16 | API routes that mutate without a UI | The contract still applies; `revalidatePath` covers any RSC that depends on the mutated data |

## Problem Statement

### Bulk-write path bugs

1. **`src/app/api/v1/participants/bulk/route.ts:28-39`** — sequential `await ParticipantService.create(...)` loop with no try/catch. First throw aborts the batch.
2. **`src/features/participants/services/participant.service.ts:69-94`** — quota increment and insert are separate operations, not in a transaction. Concurrent batches can both pass the quota check.
3. **`src/features/participants/services/participant.service.ts:96-122`** — `profileSlug` is set after insert via a separate UPDATE. If the slug loop throws, the participant remains with no slug.
4. **`src/features/programmes/services/programme.service.ts:93-139`** — single `db.insert(array)` with no cap and no transaction. Usage increment and insert are separate operations.
5. **`src/components/festival/pre-event-works/participants/BulkUploadParticipantsModal.tsx:329-347`** — modal currently calls the HTTP route, bypassing `bulkCreateParticipantsAction` (which has per-row errors, chest-number assignment, and `revalidatePath`).
6. **`src/api/client/groups.ts`** — `useUpdateGroup` destructures `festivalId` from the return value of the mutation, not from the input variables. Cache invalidation silently does nothing.

### Write-path refresh bugs

Per the comprehensive audit of all write paths:

- **All ~50 API route POST/PUT/DELETE handlers do not call `revalidatePath`.**
- **Some server actions (programme, participant, group, category, judge) do not call `revalidatePath`** even though their data appears on RSC pages.
- Mutation hooks inconsistently invalidate query keys; some miss category-filtered variants.
- The schedule page (`/dashboard/[slug]/pre-event-works/schedule`) is an RSC that uses server-rendered props, not `useSchedule`. Mutations via API routes do not refresh this page.
- `judgement.actions.ts:2060` (`saveScoringPolicyAction`) has zero `revalidatePath` or `qc.invalidateQueries` — broken.
- `invitation.actions.ts:120` (`acceptInvitationAction`) does not invalidate festival/member keys — broken for already-mounted consumers.

### Concrete user impact

- **User reports uploading 100 participants, only some are added and the rest are silently missed.** Caused by #1 above.
- **User has to manually refresh the page after bulk upload.** Caused by #5 above (HTTP route doesn't revalidate) plus the broader #4-5 missing refresh contract.
- **User reports "stage created by" shows a UUID instead of a name.** This is a separate issue (Issue C) but related: the API write route stores the UUID while the server action stores the name — same pattern of two paths diverging.

## Out of Scope

- Migrating every consumer to use the new contract automatically. The audit script surfaces gaps; per-page fixes land as follow-ups.
- Changing the bulk upload file format (xlsx/csv parsing stays the same).
- Adding row-level optimistic UI updates.
- Per-resource cap enforcement (e.g. max 5000 participants per festival) — already handled by tier quota, no change here.
- Adding a retry mechanism for transient DB errors.

## Solution

### 1. Bulk-write contract

Standardize on three properties for every bulk endpoint:

1. **Bounded** — zod `.max(N)` where N is the per-batch cap.
2. **Transactional** — runs in `db.transaction(async (tx) => ...)`. Quota increment + row inserts + post-write work (chest numbers, slugs) all in the same tx.
3. **Per-row reportable** — returns `{ successCount, errors }` on partial success. Caller surfaces errors in the UI.

### 2. Participants bulk — route through server action

`BulkUploadParticipantsModal.tsx:329-347`: replace `bulkCreateParticipants` HTTP call with direct call to `bulkCreateParticipantsAction` (imported from `@/features/participants/actions/participant.actions`). The action already returns `{ success, successCount, errors }`.

The existing server action at `participant.actions.ts:142-213` already has per-row try/catch and `revalidatePath`. We update it to be transactional:

```ts
export async function bulkCreateParticipantsAction(festivalId, participants) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  const tierLimit = TIER_CONFIG[getResolvedTier(festival.tier as any)].limits.participants;
  const [currentCountResult] = await db
    .select({ c: count() })
    .from(participantTable)
    .where(eq(participantTable.festivalId, festivalId));

  if (currentCountResult.c + participants.length > tierLimit) {
    return { success: false, successCount: 0, errors: [{ name: "ALL", error: `Batch exceeds limit. You can add ${tierLimit - currentCountResult.c} more.` }] };
  }

  let successCount = 0;
  const errors: { name: string; error: string }[] = [];

  // Process serially — per-row try/catch ensures partial success is reportable.
  // Note: not a single tx; each row is its own micro-tx. If we need strict
  // atomicity, we wrap ParticipantService.create in a tx (next bullet).
  for (const participant of participants) {
    try {
      await db.transaction(async (tx) => {
        const newParticipant = await ParticipantService.create(festivalId, {
          name: participant.name,
          groupId: participant.groupId,
          categoryId: participant.categoryId,
          email: participant.email,
          phone: participant.phone,
          gender: (participant.gender as "MALE" | "FEMALE" | "OTHER") || "MALE",
          dateOfBirth: participant.dateOfBirth || "2000-01-01",
          standard: participant.standard,
        }, tx);
        await assignChestNumberForNewParticipant(festivalId, newParticipant.id, tx);
      });
      successCount++;
    } catch (error: unknown) {
      errors.push({
        name: participant.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  try {
    revalidatePath(`/dashboard/${festival.slug}/pre-event-works/participants`);
  } catch (error) {
    console.error("[revalidatePath] participants page", error);
  }

  return { success: true, successCount, errors };
}
```

### 3. `ParticipantService.create` — accept optional tx

`src/features/participants/services/participant.service.ts`:

```ts
async create(
  festivalId: string,
  data: { ... },
  tx?: typeof db,    // <-- new optional parameter
) {
  const client = tx ?? db;
  // ... rest of method, swap every `db` for `client` ...
}
```

Same change for `assignChestNumberForNewParticipant` (`src/features/participants/actions/chest-number.actions.ts:248`).

### 4. `UsageCounterService.incrementUsage` — accept optional tx

`src/features/festivals/services/usage-counter.service.ts`: extend to accept an optional `tx` so the participant bulk can do `incrementUsage(festivalId, "participants", 1, tx)` inside the same transaction.

### 5. Programmes bulk — add cap + chunk + transaction

New zod schema at `src/api/contracts/programmes.ts`:

```ts
export const bulkCreateProgrammesInput = z.object({
  programmes: z.array(createProgrammeInput).min(1).max(1000),
});
```

`ProgrammeService.bulkCreate` refactor (`src/features/programmes/services/programme.service.ts:93-139`):

```ts
async bulkCreate(festivalId, programmeList) {
  if (programmeList.length === 0) return [];

  return await db.transaction(async (tx) => {
    // Validate duplicates within the batch + against DB
    const existing = await tx
      .select({ name: programmes.name, categoryId: programmes.categoryId, type: programmes.type })
      .from(programmes)
      .where(
        and(
          eq(programmes.festivalId, festivalId),
          or(...programmeList.map((p) =>
            and(
              eq(sql`LOWER(${programmes.name})`, p.name.trim().toLowerCase()),
              eq(programmes.categoryId, p.categoryId),
              eq(programmes.type, p.type),
            ),
          )),
        ),
      );
    if (existing.length > 0) {
      throw new AppError(`A programme with this name, category, and type already exists: ${existing.map((e) => e.name).join(", ")}`);
    }

    await UsageCounterService.incrementUsage(festivalId, "programmes", programmeList.length, tx);

    // Chunk in groups of 1000 (already at the cap, but defensive)
    const CHUNK = 1000;
    const all: typeof programmes.$inferSelect[] = [];
    for (let i = 0; i < programmeList.length; i += CHUNK) {
      const chunk = programmeList.slice(i, i + CHUNK);
      const data = chunk.map((p) => ({
        id: randomUUID(),
        updatedAt: serverNowIso(),
        festivalId,
        name: p.name,
        categoryId: p.categoryId,
        type: p.type,
        stageType: p.stageType,
        maxParticipantsPerGroup: p.maxParticipantsPerGroup || 1,
        maxTeamsPerGroup: p.maxTeamsPerGroup || 1,
        maxParticipantsPerTeam: p.maxParticipantsPerTeam || 1,
      }));
      const inserted = await tx.insert(programmes).values(data).returning();
      all.push(...inserted);
    }
    return all;
  });
}
```

If the transaction throws, usage is rolled back automatically.

### 6. Programmes bulk action — add `revalidatePath`

`bulkCreateProgrammesAction` (`programme.actions.ts:143-174`): add at the end:

```ts
try {
  revalidatePath(`/dashboard/${festival.slug}/pre-event-works/programmes`);
} catch (error) {
  console.error("[revalidatePath] programmes page", error);
}
```

### 7. HTTP participants bulk — defence-in-depth

`src/app/api/v1/participants/bulk/route.ts:28-39`: wrap each row in try/catch, accumulate errors, return `{ created, errors }`. Even if the modal stops calling this route, no future caller hits the abort bug.

```ts
const created: Array<...> = [];
const errors: Array<{ name: string; error: string }> = [];
for (const p of parsed.data.participants) {
  try {
    const c = await ParticipantService.create(festivalId, { ...p, dateOfBirth: today });
    created.push(c);
  } catch (e) {
    errors.push({ name: p.name, error: e instanceof Error ? e.message : String(e) });
  }
}
return ok({ created, errors });
```

### 8. Write-path refresh contract

For each write path, three requirements:

1. The route/action calls `revalidatePath('/dashboard/{slug}/...')` for the affected page.
2. The mutation hook's `onSuccess` calls `qc.invalidateQueries({ queryKey: [...] })` for all client subscribers.
3. The consumer component (if a dialog/mutation lives in one) calls `router.refresh()` after success — only needed if RSC server props feed the consumer.

Document in `src/api/client/README.md`:

```markdown
# Mutation refresh contract

Every write path (mutation hook + server action / API route) must:

1. Call `revalidatePath` for every RSC page that displays the affected data.
2. Invalidate React Query keys for every client component that subscribes via `useQuery`.
3. If the consumer reads server-rendered props (not just client queries), also call `router.refresh()` after the mutation succeeds.

If you add a new mutation, find every page that renders the affected data and ensure the three layers cover it.

## Checklist for a new mutation

- [ ] `revalidatePath` called for the affected RSC page
- [ ] `qc.invalidateQueries` called for the affected query key (prefix-match where applicable)
- [ ] Consumer calls `router.refresh()` if it depends on server-rendered props
- [ ] Tests assert the three layers (mock `next/cache`, mock the query client, assert consumer `router.refresh()` if applicable)
```

### 9. Audit script

`scripts/audit/write-path-refresh.ts` — one-off Node script that walks `src/app/api/v1/**/route.ts` and `src/features/**/actions/*.ts`, parses the file, and flags handlers that don't call `revalidatePath` or `qc.invalidateQueries`. Run in CI; non-blocking for now.

```ts
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const ROOTS = ["src/app/api/v1", "src/features"];
const HANDLER_RE = /(?:async (?:POST|PUT|DELETE|PATCH)\b|export async function)/g;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

const flags: { file: string; handler: string; missing: string[] }[] = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    let inHandler = false;
    let braceDepth = 0;
    let handlerStart = 0;
    let body = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!inHandler && /(?:async (POST|PUT|DELETE|PATCH)\b|export async function \w+)/.test(line)) {
        inHandler = true;
        handlerStart = i;
        body = line + "\n";
        braceDepth = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
        continue;
      }
      if (inHandler) {
        body += line + "\n";
        braceDepth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
        if (braceDepth <= 0) {
          inHandler = false;
          const missing: string[] = [];
          if (!/revalidatePath\s*\(/.test(body)) missing.push("revalidatePath");
          // For client hook files, also flag missing invalidateQueries
          if (/^src\/api\/client/.test(file) && !/qc\.invalidateQueries|queryClient\.invalidateQueries/.test(body)) {
            missing.push("invalidateQueries");
          }
          if (missing.length > 0) {
            flags.push({ file, handler: `${file}:${handlerStart + 1}`, missing });
          }
          body = "";
        }
      }
    }
  }
}

if (flags.length > 0) {
  console.log(`\n[write-path-refresh] Found ${flags.length} write handlers missing refresh calls:\n`);
  for (const f of flags) console.log(`  ${f.handler} — missing: ${f.missing.join(", ")}`);
  console.log("\nSee src/api/client/README.md for the contract.\n");
}
process.exit(0); // non-blocking for now
```

Add to `package.json`:

```json
"scripts": {
  "audit:write-path": "tsx scripts/audit/write-path-refresh.ts"
}
```

### 10. Fix the group hook bug

`src/api/client/groups.ts`:

```ts
// Before:
onSuccess: ({ festivalId }) => {
  qc.invalidateQueries({ queryKey: queryKeys.groups.all(festivalId) });   // wrong — destructures from response
}

// After:
onSuccess: (_data, { festivalId }) => {
  qc.invalidateQueries({ queryKey: queryKeys.groups.all(festivalId) });
}
```

### 11. Bulk upload completion UI

`BulkUploadFlow.tsx` already supports a result panel. Wire it to surface `successCount` and the per-row error list. Add a "Download errors as CSV" button that builds a CSV in-memory and triggers download.

```tsx
{result && (
  <div className="bulk-upload-summary">
    <p>Inserted: {result.successCount}</p>
    {result.errors.length > 0 && (
      <>
        <p>Failed: {result.errors.length}</p>
        <ul>
          {result.errors.map((e, i) => <li key={i}>{e.name}: {e.error}</li>)}
        </ul>
        <Button onClick={() => downloadErrorsAsCsv(result.errors)}>Download errors</Button>
      </>
    )}
  </div>
)}
```

### 12. UI banner on programmes bulk modal

`BulkUploadProgrammesModal.tsx`: add a small banner above the upload area: "Up to 1000 rows per upload."

Same for `BulkUploadParticipantsModal.tsx`: add the banner if not already present (it likely is, since the zod cap already triggers).

## Phased Implementation Order

| # | Phase | Deliverable | Verify |
|---|---|---|---|
| B.1 | `ParticipantService.create` accepts tx | Optional `tx` parameter, all internal `db` calls swap to `client` | Existing unit tests pass |
| B.2 | `UsageCounterService.incrementUsage` accepts tx | Optional `tx` parameter | Existing unit tests pass |
| B.3 | `bulkCreateParticipantsAction` is transactional | Each row in its own tx; chest numbers atomic; partial success reported | Integration test: 100 rows succeed; row-50 duplicate gives 99 success + 1 error; quota consistent |
| B.4 | Modal routes through action | `BulkUploadParticipantsModal.tsx` calls `bulkCreateParticipantsAction` | Manual: upload 100 → all visible, chest numbers assigned, errors listed |
| B.5 | HTTP defence-in-depth | `/api/v1/participants/bulk` returns `{ created, errors }` | Unit test confirms no abort on row-50 duplicate |
| B.6 | `bulkCreateProgrammesInput` zod | New schema with `.max(1000)` | Schema unit tests |
| B.7 | `ProgrammeService.bulkCreate` is transactional + chunked | tx-wrapped, deduplicated, chunked insert | Integration test: 50 success; >1000 rejected; quota consistent |
| B.8 | Programmes action revalidates | `bulkCreateProgrammesAction` calls `revalidatePath` | Manual: upload 50 programmes → page refreshes |
| B.9 | Refresh contract doc | `src/api/client/README.md` | PR review uses it |
| B.10 | Audit script | `scripts/audit/write-path-refresh.ts` | Script runs, flags missing handlers |
| B.11 | Group hook bug | `useUpdateGroup` fixed | Manual: edit group → list refreshes |
| B.12 | Add `revalidatePath` to all 50 API handlers | Mechanical sweep | Audit script reports zero flags for `revalidatePath` |
| B.13 | Scoring policy fix | `saveScoringPolicyAction` adds `revalidatePath` | Manual: edit scoring policy → marks page refreshes |
| B.14 | Invitation accept fix | `acceptInvitationAction` invalidates festival/member keys | Manual: accept invite → member list refreshes |
| B.15 | Bulk completion UI | `BulkUploadFlow` shows errors + CSV download | Manual: upload with bad row → errors visible, downloadable |
| B.16 | UI banner | Both modals show "Up to 1000 rows" | Manual |
| B.17 | Integration tests | `bulk-create-participants.test.ts`, `bulk-create-programmes.test.ts` | CI green |
| B.18 | CI gating | `audit:write-path` runs on PR (non-blocking) | CI logs audit report |

## Files Touched

**New**
- `src/api/contracts/programmes.ts` — add `bulkCreateProgrammesInput`
- `src/api/client/README.md` — refresh contract
- `scripts/audit/write-path-refresh.ts`
- `src/test/integration/bulk-create-participants.test.ts`
- `src/test/integration/bulk-create-programmes.test.ts`

**Modified**
- `src/app/api/v1/participants/bulk/route.ts` (defence-in-depth + `revalidatePath`)
- `src/features/participants/services/participant.service.ts` (accept tx)
- `src/features/participants/actions/participant.actions.ts` (transactional loop)
- `src/features/participants/actions/chest-number.actions.ts` (accept tx on `assignChestNumberForNewParticipant`)
- `src/features/festivals/services/usage-counter.service.ts` (accept tx)
- `src/components/festival/pre-event-works/participants/BulkUploadParticipantsModal.tsx` (route through action)
- `src/features/programmes/actions/programme.actions.ts` (revalidatePath on bulk)
- `src/features/programmes/services/programme.service.ts` (transactional + chunked bulk)
- `src/components/festival/pre-event-works/programmes/BulkUploadProgrammesModal.tsx` (banner)
- `src/components/common/bulk-upload/BulkUploadFlow.tsx` (error display + CSV download)
- `src/api/client/groups.ts` (bug fix)
- 50 API route handlers (mechanical `revalidatePath` additions)
- `src/features/judgement/actions/judgement.actions.ts:2060` (scoring policy revalidation)
- `src/features/invitation/actions/invitation.actions.ts:120` (accept invalidation)
- `package.json` (`audit:write-path` script)
- `.github/workflows/ci.yml` (or equivalent CI config)

## Verification

- `npm run test:unit` + `npm run test:integration` pass
- `npm run audit:write-path` returns zero flags for `revalidatePath` and `invalidateQueries`
- Manual: upload 100 participants → all visible with chest numbers, errors listed
- Manual: upload 50 programmes → all visible after upload (no manual refresh)
- Manual: edit any resource via API path → page refreshes without full reload
- Manual: edit a group → group list refreshes without manual reload (group hook bug fix)
- Manual: edit scoring policy → marks page reflects the change
- Manual: accept an invitation → member list updates
