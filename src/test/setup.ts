import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("resend", async () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi
          .fn()
          .mockResolvedValue({ data: { id: "test-email-id" }, error: null }),
      },
    })),
  };
});

afterEach(() => {
  cleanup();
});

beforeAll(() => {
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    JWT_SECRET: "test-secret-key-for-testing-only",
    CRON_SECRET: "test-cron-secret",
    RESEND_API_KEY: "test_resend_key",
  });
});
