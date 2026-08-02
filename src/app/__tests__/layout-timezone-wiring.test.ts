import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "../../../..");
const SRC_ROOT = resolve(REPO_ROOT, "greenroom/src");

function readLayout(relativePath: string): string {
  return readFileSync(resolve(SRC_ROOT, relativePath), "utf8");
}

/**
 * Regression guard for the deadline-display bug: team leaders used to see
 * `Aug 8, 6:30 PM` instead of `Aug 9, 12:00 AM` because the (participant)
 * layout never wrapped its children in `<UserTimezoneProviderClient>`,
 * so `useDisplayTimezone()` fell back to `DEFAULT_TZ` ("UTC").
 *
 * A `.test.tsx` would require jsdom + RTL + vitest-config changes; this
 * source-grep test catches the regression at the import level, which is
 * the actual root cause. Add the same assertion for every new layout
 * that mounts a component reading `useDisplayTimezone()`.
 */
describe("route-group layouts wire UserTimezoneProviderClient", () => {
  const cases: Array<{
    label: string;
    path: string;
    requireFestivalTimezone: boolean;
  }> = [
    {
      label: "(participant) — team-leader pages",
      path: "app/(participant)/[slug]/[participantSlug]/layout.tsx",
      requireFestivalTimezone: true,
    },
    {
      label: "(festivalPublic) — public festival site",
      path: "app/(festivalPublic)/[slug]/layout.tsx",
      requireFestivalTimezone: true,
    },
  ];

  for (const { label, path, requireFestivalTimezone } of cases) {
    describe(label, () => {
      const source = readLayout(path);

      it("imports UserTimezoneProviderClient", () => {
        expect(source).toMatch(/from\s+["']@\/components\/providers\/user-timezone-provider-client["']/);
      });

      it("renders <UserTimezoneProviderClient> in its JSX", () => {
        expect(source).toMatch(/<UserTimezoneProviderClient[\s>]/);
      });

      if (requireFestivalTimezone) {
        it("forwards festival.timezone to the provider", () => {
          // Accept either `festival.timezone` or `festival.timezone ?? null`
          // (both are equivalent for the schema — `festival.timezone` is
          // `text NOT NULL DEFAULT 'UTC'`, so the fallback never fires).
          expect(source).toMatch(/festivalTimezone=\{festival\.timezone/);
        });
      }
    });
  }
});
