import { describe, expect, it } from "vitest";
import { uploadFolderEnum, uploadInput } from "./upload";

describe("uploadFolderEnum", () => {
  it("includes all expected folders including templates", () => {
    const validFolders = [
      "logo",
      "hero",
      "news",
      "media",
      "poster",
      "templates",
    ];

    for (const folder of validFolders) {
      expect(uploadFolderEnum.safeParse(folder).success).toBe(true);
    }
  });

  it("rejects unknown folder values", () => {
    expect(uploadFolderEnum.safeParse("unknown").success).toBe(false);
    expect(uploadFolderEnum.safeParse("").success).toBe(false);
    expect(uploadFolderEnum.safeParse("poster-templates").success).toBe(false);
  });
});

describe("uploadInput", () => {
  it("successfully parses valid input with templates", () => {
    const parsed = uploadInput.safeParse({
      file: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      folder: "templates",
      festivalId: "fest-123",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.folder).toBe("templates");
      expect(parsed.data.festivalId).toBe("fest-123");
    }
  });

  it("fails parsing when folder is invalid", () => {
    const parsed = uploadInput.safeParse({
      file: "some-file",
      folder: "invalid-folder",
      festivalId: "fest-123",
    });

    expect(parsed.success).toBe(false);
  });
});
