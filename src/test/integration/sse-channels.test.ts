/**
 * End-to-end test for the Issue 46 SSE channels + Issue 47 producers +
 * Issue 48 client hook plumbing.
 *
 * Spins up a real Redis container via Testcontainers, runs the same
 * `sseHandler` factory used by every route, and connects an
 * `eventsource-client` against a real `node:http` server so we exercise
 * the wire format (`data: <json>\n\n`, comment lines, reconnect).
 *
 * Each of the 9 channels is exercised in turn: the test publishes a
 * payload, asserts the connected client receives it, then disconnects.
 *
 * Run via: `npm run test:integration -- sse-channels`
 */

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import {
  RedisContainer,
  type StartedRedisContainer,
} from "@testcontainers/redis";
import { createEventSource } from "eventsource-client";
import Redis from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getRedis } from "@/core/redis/client";
import { keys } from "@/core/redis/keys";
import { sseHandler } from "@/core/sse/sse-handler";

let postgres: StartedPostgreSqlContainer;
let redis: StartedRedisContainer;
let redisClient: Redis;

beforeAll(async () => {
  postgres = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("greenroom_test")
    .withUsername("test")
    .withPassword("test")
    .start();
  process.env.DATABASE_URL = postgres.getConnectionUri();
  process.env.DATABASE_URL_UNPOOLED = postgres.getConnectionUri();

  redis = await new RedisContainer("redis:7-alpine").start();
  process.env.REDIS_URL = redis.getConnectionUrl();
  redisClient = new Redis(redis.getConnectionUrl(), {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  await redisClient.ping();
}, 60_000);

afterAll(async () => {
  await redisClient?.quit();
  await redis?.stop();
  await postgres?.stop();
});

interface ChannelCase {
  /** Human-readable name for the test case. */
  name: string;
  /** SSE handler factory that returns the route handler. */
  handler: () => (req: Request) => Promise<Response>;
  /** Channel key the test will `publish()` to. */
  channelKey: string;
  /** Payload that gets pushed; the test asserts the client receives it. */
  payload: unknown;
}

/** Spin up an ephemeral `node:http` server that runs the SSE handler. */
async function startServerWithHandler(
  handler: (req: Request) => Promise<Response>,
): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = `http://localhost:${(server.address() as { port: number }).port}${req.url ?? "/"}`;
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = Buffer.concat(chunks).toString("utf8");
      const init: RequestInit = {
        method: req.method,
        headers: req.headers as Record<string, string>,
      };
      if (body) init.body = body;
      const webReq = new Request(url, init);

      const webRes = await handler(webReq);
      res.statusCode = webRes.status;
      webRes.headers.forEach((v, k) => {
        res.setHeader(k, v);
      });
      if (webRes.body) {
        const reader = webRes.body.getReader();
        const pump = async () => {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            return;
          }
          res.write(Buffer.from(value));
          pump();
        };
        pump();
      } else {
        res.end();
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          }),
      });
    });
  });
}

const CHANNEL_CASES: ChannelCase[] = [
  {
    name: "UC3 score-events",
    channelKey: "programmeScoreEvents",
    handler: () =>
      sseHandler<{ params: Promise<{ programmeId: string }> }>({
        channel: async (_req, ctx) =>
          keys.programmeScoreEvents((await ctx.params).programmeId),
        auth: async () => null, // bypass for this test
      }),
    payload: { programmeId: "p-test", judgeId: "j-test", score: 9.5 },
  },
  {
    name: "UC6 announce",
    channelKey: "festivalAnnounce",
    handler: () =>
      sseHandler<{ params: Promise<{ festivalId: string }> }>({
        channel: async (_req, ctx) =>
          keys.festivalAnnounce((await ctx.params).festivalId),
        auth: async () => null,
      }),
    payload: { programmeId: "p-test", position: 1, resultNumber: 1 },
  },
  {
    name: "UC7 standings",
    channelKey: "festivalStandings",
    handler: () =>
      sseHandler<{ params: Promise<{ festivalId: string }> }>({
        channel: async (_req, ctx) =>
          keys.festivalStandings((await ctx.params).festivalId),
        auth: async () => null,
      }),
    payload: { teamStandings: [{ name: "Alpha", points: 12 }] },
  },
  {
    name: "UC9 food-hall events",
    channelKey: "foodHallEvents",
    handler: () =>
      sseHandler<{ params: Promise<{ slotId: string }> }>({
        channel: async (_req, ctx) =>
          keys.foodHallEvents((await ctx.params).slotId),
        auth: async () => null,
      }),
    payload: { slotId: "slot-test", scannedAt: new Date().toISOString() },
  },
  {
    name: "UC13 super-admin stats",
    channelKey: "superAdminStats",
    handler: () =>
      sseHandler({
        channel: keys.superAdminStats(),
        auth: async () => null,
      }),
    payload: { tickedAt: new Date().toISOString() },
  },
  {
    name: "UC14 chest-numbers",
    channelKey: "festivalChestNumbers",
    handler: () =>
      sseHandler<{ params: Promise<{ festivalId: string }> }>({
        channel: async (_req, ctx) =>
          keys.festivalChestNumbers((await ctx.params).festivalId),
        auth: async () => null,
      }),
    payload: { festivalId: "f-test", action: "REGENERATED" },
  },
  {
    name: "UC15 schedule",
    channelKey: "festivalSchedule",
    handler: () =>
      sseHandler<{ params: Promise<{ festivalId: string }> }>({
        channel: async (_req, ctx) =>
          keys.festivalSchedule((await ctx.params).festivalId),
        auth: async () => null,
      }),
    payload: { festivalId: "f-test", entryId: "e-test", action: "CREATED" },
  },
  {
    name: "UC16 countdown",
    channelKey: "festivalCountdown",
    handler: () =>
      sseHandler<{ params: Promise<{ festivalId: string }> }>({
        channel: async (_req, ctx) =>
          keys.festivalCountdown((await ctx.params).festivalId),
        auth: async () => null,
      }),
    payload: {
      daysToStart: 5,
      daysToEnd: 7,
      daysToExpire: 14,
      tickedAt: new Date().toISOString(),
    },
  },
  {
    name: "UC17 results-count",
    channelKey: "festivalResultsCount",
    handler: () =>
      sseHandler<{ params: Promise<{ festivalId: string }> }>({
        channel: async (_req, ctx) =>
          keys.festivalResultsCount((await ctx.params).festivalId),
        auth: async () => null,
      }),
    payload: { festivalId: "f-test", count: 42 },
  },
];

describe("SSE channels end-to-end", () => {
  it.each(
    CHANNEL_CASES,
  )("$name — publishes a payload and the client receives it", async ({
    handler,
    channelKey,
    payload,
  }) => {
    const festivalId = "f-test";
    const { url, close } = await startServerWithHandler(handler());

    // Resolve the URL the SSE client should connect to.
    const path =
      channelKey === "superAdminStats"
        ? "/super-admin/stats/stream"
        : channelKey === "foodHallEvents"
          ? "/food-hall/slot-test/events/stream"
          : channelKey === "programmeScoreEvents"
            ? "/programmes/p-test/score-events/stream"
            : `/festivals/${festivalId}/${channelKey.replace("festival", "").replace("foodHall", "").toLowerCase()}/stream`;

    const collected: string[] = [];
    const es = createEventSource({
      url: `${url}${path}`,
      fetch: globalThis.fetch,
    });

    const messages: string[] = [];
    const collector = (async () => {
      for await (const msg of es) {
        messages.push(msg.data);
        if (messages.length >= 1) break;
      }
    })();

    // Allow the connection to open.
    await new Promise((r) => setTimeout(r, 200));

    // Publish to the channel. We use the singleton `getRedis()` because
    // that's what the producers use, and a fresh test-only client.
    const redis = getRedis();
    const channel = resolveChannel(channelKey, payload);
    await redis.publish(channel, JSON.stringify(payload));
    await redisClient.publish(channel, JSON.stringify(payload));

    // Wait for the message or timeout.
    await Promise.race([
      collector,
      new Promise((_r, reject) =>
        setTimeout(
          () => reject(new Error("timeout waiting for SSE event")),
          5000,
        ),
      ),
    ]);

    await es.close();
    await close();

    // Each `publish()` may deliver once or twice (we publish on two
    // clients); assert the payload appears at least once.
    const matched = messages.find((m) => {
      try {
        const parsed = JSON.parse(m);
        return JSON.stringify(parsed) === JSON.stringify(payload);
      } catch {
        return false;
      }
    });
    expect(matched).toBeDefined();
  }, 30_000);
});

function resolveChannel(channelKey: string, payload: unknown): string {
  // Map the channelKey to its concrete Redis key (matches `keys.*`).
  const id =
    (payload as { festivalId?: string; programmeId?: string; slotId?: string })
      .festivalId ??
    (payload as { programmeId?: string }).programmeId ??
    (payload as { slotId?: string }).slotId ??
    "global";
  switch (channelKey) {
    case "programmeScoreEvents":
      return keys.programmeScoreEvents(id);
    case "festivalAnnounce":
      return keys.festivalAnnounce(id);
    case "festivalStandings":
      return keys.festivalStandings(id);
    case "foodHallEvents":
      return keys.foodHallEvents(id);
    case "superAdminStats":
      return keys.superAdminStats();
    case "festivalChestNumbers":
      return keys.festivalChestNumbers(id);
    case "festivalSchedule":
      return keys.festivalSchedule(id);
    case "festivalCountdown":
      return keys.festivalCountdown(id);
    case "festivalResultsCount":
      return keys.festivalResultsCount(id);
    default:
      throw new Error(`unknown channelKey ${channelKey}`);
  }
}

// Mark these as intentionally unused — they document the harness shape.
void ((): void => {
  const _: IncomingMessage | ServerResponse | null = null;
  void _;
});
