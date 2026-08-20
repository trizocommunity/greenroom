import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/institutions/repositories/institution.repository", () => ({
  findVerifiedInstitutionByCustomDomain: vi.fn(),
}));
vi.mock("@/features/festivals/repositories/festival.repository", () => ({
  findBrandedRedirectTarget: vi.fn(),
}));

import { findBrandedRedirectTarget } from "@/features/festivals/repositories/festival.repository";
import { findVerifiedInstitutionByCustomDomain } from "@/features/institutions/repositories/institution.repository";
import { proxy } from "./proxy";

const findVerified = vi.mocked(findVerifiedInstitutionByCustomDomain);
const findBranded = vi.mocked(findBrandedRedirectTarget);

const APP_HOST = "greenroomfestivals.in";
const BRANDED_HOST = "zenoraev.ahlussuffa.in";

function request(host: string, path: string) {
  return new NextRequest(`https://${host}${path}`, {
    headers: { host, "x-forwarded-proto": "https" },
  });
}

/** Header the rewrite injects for server components, as Next encodes it. */
function overriddenRequestHeader(response: Response, name: string) {
  return response.headers.get(`x-middleware-request-${name}`);
}

describe("proxy host routing", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", `https://${APP_HOST}`);
    vi.stubEnv("DISABLE_CUSTOM_DOMAIN_CANONICAL_REDIRECT", "");
    findVerified.mockResolvedValue({ institutionId: "inst_1" } as never);
    findBranded.mockResolvedValue(null as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("branded host", () => {
    it("rewrites the clean path onto the festival subtree with domain headers", async () => {
      const res = await proxy(request(BRANDED_HOST, "/news"));

      expect(res.headers.get("x-middleware-rewrite")).toContain(
        "/zenoraev/news",
      );
      expect(overriddenRequestHeader(res, "x-custom-domain")).toBe(
        "ahlussuffa.in",
      );
      expect(overriddenRequestHeader(res, "x-festival-slug")).toBe("zenoraev");
      expect(overriddenRequestHeader(res, "x-institution-id")).toBe("inst_1");
    });

    it("serves the festival landing page at the root", async () => {
      const res = await proxy(request(BRANDED_HOST, "/"));
      expect(res.headers.get("x-middleware-rewrite")).toContain("/zenoraev");
    });

    it("redirects a leaked `/{slug}` prefix to the clean path", async () => {
      const res = await proxy(request(BRANDED_HOST, "/zenoraev/news"));

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(`https://${BRANDED_HOST}/news`);
    });

    it("keeps the query string when stripping the prefix", async () => {
      const res = await proxy(
        request(BRANDED_HOST, "/zenoraev/results?page=2"),
      );

      expect(res.headers.get("location")).toBe(
        `https://${BRANDED_HOST}/results?page=2`,
      );
    });

    it("sends `/{slug}` itself to the festival root", async () => {
      const res = await proxy(request(BRANDED_HOST, "/zenoraev"));
      expect(res.headers.get("location")).toBe(`https://${BRANDED_HOST}/`);
    });

    it("strips one segment per hop so a doubled prefix terminates", async () => {
      const res = await proxy(request(BRANDED_HOST, "/zenoraev/zenoraev/news"));
      expect(res.headers.get("location")).toBe(
        `https://${BRANDED_HOST}/zenoraev/news`,
      );
    });

    it("sends the organizer dashboard back to the app host", async () => {
      const res = await proxy(request(BRANDED_HOST, "/dashboard/zenoraev"));

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        `https://${APP_HOST}/dashboard/zenoraev`,
      );
    });

    it("leaves API and static requests on the same origin", async () => {
      const res = await proxy(request(BRANDED_HOST, "/api/festivals"));
      expect(res.headers.get("x-middleware-rewrite")).toBeNull();
      expect(res.status).toBe(200);
    });

    it("404s a host whose domain is not verified", async () => {
      findVerified.mockResolvedValue(undefined as never);
      const res = await proxy(request(BRANDED_HOST, "/news"));
      expect(res.status).toBe(404);
    });
  });

  describe("app host canonical redirect", () => {
    beforeEach(() => {
      findBranded.mockResolvedValue({
        festivalSlug: "zenoraev",
        customDomain: "ahlussuffa.in",
      } as never);
    });

    it("redirects a public festival path to the branded host", async () => {
      const res = await proxy(request(APP_HOST, "/zenoraev/news"));

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(`https://${BRANDED_HOST}/news`);
    });

    it("redirects the festival landing page to the branded root", async () => {
      const res = await proxy(request(APP_HOST, "/zenoraev"));
      expect(res.headers.get("location")).toBe(`https://${BRANDED_HOST}/`);
    });

    it("carries the query string across", async () => {
      const res = await proxy(request(APP_HOST, "/zenoraev/results?page=2"));
      expect(res.headers.get("location")).toBe(
        `https://${BRANDED_HOST}/results?page=2`,
      );
    });

    it("keeps app-host-only surfaces where their cookies work", async () => {
      for (const path of [
        "/zenoraev/editor",
        "/zenoraev/stage-portal",
        "/dashboard/zenoraev",
        "/login",
        "/api/festivals/zenoraev",
      ]) {
        const res = await proxy(request(APP_HOST, path));
        expect(res.headers.get("location"), path).toBeNull();
      }
    });

    it("stays put when the festival has no branded host ready", async () => {
      findBranded.mockResolvedValue(null as never);
      const res = await proxy(request(APP_HOST, "/zenoraev/news"));
      expect(res.headers.get("location")).toBeNull();
    });

    it("stays put when the kill switch is set", async () => {
      vi.stubEnv("DISABLE_CUSTOM_DOMAIN_CANONICAL_REDIRECT", "true");
      const res = await proxy(request(APP_HOST, "/zenoraev/news"));
      expect(res.headers.get("location")).toBeNull();
      expect(findBranded).not.toHaveBeenCalled();
    });

    it("stays put when the lookup fails so the path URL keeps working", async () => {
      findBranded.mockRejectedValue(new Error("db down") as never);
      const res = await proxy(request(APP_HOST, "/zenoraev/news"));
      expect(res.headers.get("location")).toBeNull();
    });

    it("never redirects on a local app host", async () => {
      const res = await proxy(request("localhost:3000", "/zenoraev/news"));
      expect(res.headers.get("location")).toBeNull();
      expect(findBranded).not.toHaveBeenCalled();
    });
  });
});
