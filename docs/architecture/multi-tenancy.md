## Multi-tenancy model

- **Type**: Row-based multi-tenancy on a single PostgreSQL database and Prisma schema.
- **Tenant**: `Festival` is the tenant entity; most domain tables carry a `festivalId` foreign key.
- **Resolution**:
  - Dashboard routes use the `[slug]` segment (e.g. `/dashboard/[slug]`) and resolve to a `Festival` via `findFestivalBySlugOrId`.
  - Public festival routes use `/(festivalPublic)/[slug]` and resolve via `getPublicFestivalData`.
- **Access control**:
  - `getFestivalContext` (in `src/server/services/festival-context.service.ts`) centralizes resolution of the current festival, the user’s role (owner, member, SUPER_ADMIN), and expiry state.
  - Dashboard layout (`src/app/dashboard/[slug]/layout.tsx`) uses this context to gate access and provide festival data to the UI.

## Data-access rules

- All tenant-owned data (students, groups, programmes, results, stages, events, etc.) must be queried with a `where: { festivalId: ... }` filter.
- Data-access should go through `src/server/models` and `src/server/services` rather than calling Prisma directly from route files.
- Key multi-tenant helpers:
  - `festival.model.ts` – core festival queries and overview data.
  - `leaderboard.service.ts` / `results.service.ts` – event-works queries.
  - `festivalPublic.ts` / `festivalResults.ts` – public site projections.

