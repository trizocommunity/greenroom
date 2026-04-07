import { createClient, type RedisClientType } from "redis";
import { realtimeConfig } from "@/lib/realtime-config";

const globalForRedis = globalThis as unknown as {
  realtimeRedisClient?: RedisClientType;
  realtimeRedisSubscriber?: RedisClientType;
};

function buildRedisClient(): RedisClientType {
  if (!realtimeConfig.redisUrl) {
    throw new Error("REDIS_URL is not defined");
  }
  return createClient({
    url: realtimeConfig.redisUrl,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 100, 2500),
    },
  });
}

async function connectIfNeeded(
  client: RedisClientType,
): Promise<RedisClientType> {
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}

export async function getRealtimeRedisClient(): Promise<RedisClientType> {
  if (!globalForRedis.realtimeRedisClient) {
    globalForRedis.realtimeRedisClient = buildRedisClient();
  }
  return connectIfNeeded(globalForRedis.realtimeRedisClient);
}

export async function getRealtimeRedisSubscriber(): Promise<RedisClientType> {
  if (!globalForRedis.realtimeRedisSubscriber) {
    const baseClient = await getRealtimeRedisClient();
    globalForRedis.realtimeRedisSubscriber = baseClient.duplicate();
  }
  return connectIfNeeded(globalForRedis.realtimeRedisSubscriber);
}
