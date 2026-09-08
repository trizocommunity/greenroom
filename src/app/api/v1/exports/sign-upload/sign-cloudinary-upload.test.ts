import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { signCloudinaryUpload } from "./sign-cloudinary-upload";

describe("signCloudinaryUpload", () => {
  const baseParams = {
    cloudName: "demo-cloud",
    apiKey: "demo-api-key",
    apiSecret: "demo-secret",
    folder: "greenroom/exports",
    publicId: "exp-1",
    timestamp: 1700000000,
  };

  it("returns a signed payload with all fields populated", () => {
    const result = signCloudinaryUpload(baseParams);
    expect(result.cloudName).toBe("demo-cloud");
    expect(result.apiKey).toBe("demo-api-key");
    expect(result.folder).toBe("greenroom/exports");
    expect(result.publicId).toBe("exp-1");
    expect(result.timestamp).toBe(1700000000);
    expect(result.signature).toMatch(/^[0-9a-f]{40}$/);
  });

  it("returns the raw upload URL (image) for cloudinary", () => {
    const result = signCloudinaryUpload(baseParams);
    expect(result.uploadUrl).toBe(
      "https://api.cloudinary.com/v1_1/demo-cloud/raw/upload",
    );
  });

  it("signature is deterministic given the same params", () => {
    const a = signCloudinaryUpload(baseParams);
    const b = signCloudinaryUpload(baseParams);
    expect(a.signature).toBe(b.signature);
  });

  it("signature matches Cloudinary's documented algorithm", () => {
    // Per Cloudinary spec: sort params alphabetically, join as k=v&k=v,
    // append apiSecret, SHA1 hash. Our signed params are
    // folder=greenroom/exports, public_id=exp-1, timestamp=1700000000
    // => alphabetically sorted: folder, public_id, timestamp.
    const expected = crypto
      .createHash("sha1")
      .update(
        `folder=greenroom/exports&public_id=exp-1&timestamp=1700000000demo-secret`,
      )
      .digest("hex");

    const result = signCloudinaryUpload(baseParams);
    expect(result.signature).toBe(expected);
  });

  it("different apiSecret produces different signature", () => {
    const a = signCloudinaryUpload({ ...baseParams, apiSecret: "secret-A" });
    const b = signCloudinaryUpload({ ...baseParams, apiSecret: "secret-B" });
    expect(a.signature).not.toBe(b.signature);
  });

  it("different publicId produces different signature", () => {
    const a = signCloudinaryUpload({ ...baseParams, publicId: "exp-1" });
    const b = signCloudinaryUpload({ ...baseParams, publicId: "exp-2" });
    expect(a.signature).not.toBe(b.signature);
  });

  it("different timestamp produces different signature", () => {
    const a = signCloudinaryUpload({ ...baseParams, timestamp: 1700000000 });
    const b = signCloudinaryUpload({ ...baseParams, timestamp: 1700000001 });
    expect(a.signature).not.toBe(b.signature);
  });

  it("preserves the folder verbatim (no sorting injection)", () => {
    const result = signCloudinaryUpload({
      ...baseParams,
      folder: "greenroom/exports/some-festival",
    });
    expect(result.folder).toBe("greenroom/exports/some-festival");
  });
});
