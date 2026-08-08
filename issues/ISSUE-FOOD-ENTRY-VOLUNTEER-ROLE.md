# ISSUE-FOOD-ENTRY-VOLUNTEER-ROLE

## Summary
Updates to the Food Hall Entry feature (originally specified in `ISSUE-FOOD-ENTRY-CHEST-NUMBER-SCAN.md`) to include a new `VOLUNTEER` role and a dedicated dashboard for volunteers.

## Key Additions
1. **New Role:** Add `VOLUNTEER` to `FestivalRole` enum.
2. **Access Control:** The Food Hall Entry scanning page is now accessible to `ADMIN`, `OWNER`, and `VOLUNTEER`.
3. **Volunteer Dashboard:** A new dedicated page at `/dashboard/[slug]/volunteer` that acts as a landing page for volunteers. It features a "Quick Actions" grid providing easy access to tools they have permission for (e.g., the Food Scanner).

## Tasks
- Add `VOLUNTEER` to `schema.ts` enum.
- Build the `src/app/dashboard/[slug]/volunteer` page.
- Update `sidebar.config.ts` to show "Volunteer Dashboard" for `VOLUNTEER` users.
- Proceed with the rest of the Food Entry implementation (slots, sessions, entries tables, scanner UI, and server actions).
