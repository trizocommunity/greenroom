/**
 * Simple in-memory rate limiting utility.
 * Uses LRU cache with automatic expiry.
 * For production with multiple servers, replace with Redis-based rate limiting.
 */

import { LRUCache } from "lru-cache";

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const rateLimitCache = new LRUCache<string, RateLimitEntry>({
  max: 500,
  ttl: 1000 * 60 * 15,
});

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000,
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;

  const entry = rateLimitCache.get(key);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowMs;
    rateLimitCache.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}
