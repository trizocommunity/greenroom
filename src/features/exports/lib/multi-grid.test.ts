import { describe, expect, it } from "vitest";
import {
  LANDSCAPE_GRID_OPTIONS,
  PORTRAIT_GRID_OPTIONS,
} from "@/app/dashboard/[slug]/exports/_components/filters/controls";
import {
  autoMultiGrid,
  type MultiGrid,
  parseMultiGrid,
} from "@/features/exports/lib/multi-grid";
import { multiGrid as multiGridSchema } from "@/features/exports/schemas/export-config.schema";

describe("multi-grid presets", () => {
  it("parses AUTO as null", () => {
    expect(parseMultiGrid("AUTO")).toBeNull();
  });

  it("parses portrait grids into cols and rows", () => {
    expect(parseMultiGrid("1x2")).toEqual({ cols: 1, rows: 2 });
    expect(parseMultiGrid("2x4")).toEqual({ cols: 2, rows: 4 });
    expect(parseMultiGrid("3x6")).toEqual({ cols: 3, rows: 6 });
    expect(parseMultiGrid("4x6")).toEqual({ cols: 4, rows: 6 });
  });

  it("parses landscape grids into cols and rows", () => {
    expect(parseMultiGrid("2x1")).toEqual({ cols: 2, rows: 1 });
    expect(parseMultiGrid("3x1")).toEqual({ cols: 3, rows: 1 });
    expect(parseMultiGrid("4x2")).toEqual({ cols: 4, rows: 2 });
    expect(parseMultiGrid("5x3")).toEqual({ cols: 5, rows: 3 });
    expect(parseMultiGrid("6x4")).toEqual({ cols: 6, rows: 4 });
  });

  it("calculates auto grid based on aspect ratio", () => {
    // Landscape A4 (842 x 595, aspect ~ 1.415)
    expect(autoMultiGrid(842, 595)).toEqual({ cols: 4, rows: 2 });

    // Square-ish
    expect(autoMultiGrid(600, 500)).toEqual({ cols: 3, rows: 3 });

    // Portrait A4 (595 x 842, aspect ~ 0.707)
    expect(autoMultiGrid(595, 842)).toEqual({ cols: 2, rows: 2 });

    // Tall portrait (400 x 800, aspect 0.5)
    expect(autoMultiGrid(400, 800)).toEqual({ cols: 2, rows: 4 });
  });

  it("validates all portrait and landscape grid options against schema", () => {
    for (const opt of PORTRAIT_GRID_OPTIONS) {
      const parsed = multiGridSchema.safeParse(opt.value);
      expect(parsed.success).toBe(true);
    }

    for (const opt of LANDSCAPE_GRID_OPTIONS) {
      const parsed = multiGridSchema.safeParse(opt.value);
      expect(parsed.success).toBe(true);
    }
  });

  it("has exactly 9 curated options for both portrait and landscape palettes", () => {
    expect(PORTRAIT_GRID_OPTIONS).toHaveLength(9);
    expect(LANDSCAPE_GRID_OPTIONS).toHaveLength(9);
    expect(PORTRAIT_GRID_OPTIONS[0].value).toBe("AUTO");
    expect(LANDSCAPE_GRID_OPTIONS[0].value).toBe("AUTO");
  });

  it("calculates auto grid considering template document aspect ratio", () => {
    // Wide badge (1050x600, aspect 1.75) on Portrait A4 (595x842).
    // 2x5 cells (≈ 289×165) hit the doc aspect almost exactly, so the
    // badge fits each cell with virtually no wasted edge space.
    expect(autoMultiGrid(595, 842, 1050, 600)).toEqual({ cols: 2, rows: 5 });

    // Tall badge (600x1050, aspect 0.57) on Portrait A4 (595x842).
    // 2x2 and 3x3 are both aspect 0.70; the smaller count wins the tie.
    expect(autoMultiGrid(595, 842, 600, 1050)).toEqual({ cols: 2, rows: 2 });

    // Wide badge (1050x600) on Landscape A4 (842x595). 2x2 and 3x3 are
    // tied at aspect 1.43 (closest to the wide doc's 1.75); 2x2 wins.
    expect(autoMultiGrid(842, 595, 1050, 600)).toEqual({ cols: 2, rows: 2 });

    // Square doc (600x600) on Portrait A4 — the cell aspect closest to
    // 1.0 is 2x3 (≈ 1.05). 3x4 (≈ 0.93) is the runner-up.
    expect(autoMultiGrid(595, 842, 600, 600)).toEqual({ cols: 2, rows: 3 });

    // Square doc on Landscape A4 — the cell aspect closest to 1.0 is
    // 3x2 (≈ 0.95). 2x3 is not in the landscape palette; 4x3 (≈ 1.07)
    // is the runner-up.
    expect(autoMultiGrid(842, 595, 600, 600)).toEqual({ cols: 3, rows: 2 });
  });
});

describe("13*19 sheet size support", () => {
  it("supports 13X19 in badgePageSize and pageSize schemas", async () => {
    const { badgePageSize, pageSize, badgeConfig } = await import(
      "@/features/exports/schemas/export-config.schema"
    );
    expect(badgePageSize.safeParse("13X19").success).toBe(true);
    expect(pageSize.safeParse("13X19").success).toBe(true);

    const parsedBadgeConfig = badgeConfig.safeParse({
      type: "BADGE",
      templateId: "test-tpl",
      pageSize: "13X19",
    });
    expect(parsedBadgeConfig.success).toBe(true);
    if (parsedBadgeConfig.success) {
      expect(parsedBadgeConfig.data.pageSize).toBe("13X19");
    }
  });

  it("includes 13X19 in BADGE_PAGE_SIZE_OPTIONS and PAGE_SIZE_OPTIONS", async () => {
    const { BADGE_PAGE_SIZE_OPTIONS, PAGE_SIZE_OPTIONS } = await import(
      "@/app/dashboard/[slug]/exports/_components/filters/controls"
    );
    expect(BADGE_PAGE_SIZE_OPTIONS.some((opt) => opt.value === "13X19")).toBe(
      true,
    );
    expect(PAGE_SIZE_OPTIONS.some((opt) => opt.value === "13X19")).toBe(true);
  });
});
