import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCronHandler } from "./create-handler";

describe("createCronHandler", () => {
  const originalEnv = process.env.CRON_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret-32bytes-12345678");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const buildHandler = (inner = vi.fn().mockResolvedValue(new Response("ok"))) => {
    const wrapped = createCronHandler({
      GET: async () => inner(),
    });
    return { wrapped, inner };
  };

  it("accepts a request with a valid Bearer token", async () => {
    const { wrapped, inner } = buildHandler();
    const req = new Request("http://localhost/api/cron", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });

    const res = await wrapped(req);
    expect(res.status).toBe(200);
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing Authorization header", async () => {
    const { wrapped, inner } = buildHandler();
    const req = new Request("http://localhost/api/cron");

    const res = await wrapped(req);
    expect(res.status).toBe(403);
    expect(inner).not.toHaveBeenCalled();
  });

  it("rejects an Authorization header with the wrong token", async () => {
    const { wrapped, inner } = buildHandler();
    const req = new Request("http://localhost/api/cron", {
      headers: { authorization: "Bearer wrong-token" },
    });

    const res = await wrapped(req);
    expect(res.status).toBe(403);
    expect(inner).not.toHaveBeenCalled();
  });

  it("rejects an Authorization header without the Bearer prefix", async () => {
    const { wrapped, inner } = buildHandler();
    const req = new Request("http://localhost/api/cron", {
      headers: { authorization: process.env.CRON_SECRET ?? "" },
    });

    const res = await wrapped(req);
    expect(res.status).toBe(403);
    expect(inner).not.toHaveBeenCalled();
  });

  it("does not accept the legacy x-cron-secret header", async () => {
    const { wrapped, inner } = buildHandler();
    const req = new Request("http://localhost/api/cron", {
      headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
    });

    const res = await wrapped(req);
    expect(res.status).toBe(403);
    expect(inner).not.toHaveBeenCalled();
  });

  it("rejects when CRON_SECRET is unset in production at module load", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "");

    expect(() =>
      createCronHandler({
        GET: async () => new Response("ok"),
      }),
    ).toThrow(/CRON_SECRET is not defined/);
  });

  it("does not throw when CRON_SECRET is unset outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CRON_SECRET", "");

    expect(() =>
      createCronHandler({
        GET: async () => new Response("ok"),
      }),
    ).not.toThrow();
  });
});