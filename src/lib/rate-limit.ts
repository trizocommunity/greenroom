/**
 * Simple in-memory rate limiting utility
 * For production with multiple servers, use Redis-based rate limiting instead
 */

import { LRUCache } from "lru-cache";

// Rate limit cache: key -> request count
type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const rateLimitCache = new LRUCache<string, RateLimitEntry>({
  max: 500,
  ttl: 1000 * 60 * 15, // 15 minutes cleanup
});

/**
 * Check if request should be rate limited
 * @param identifier - IP address or user ID
 * @param maxRequests - Max requests allowed in window (default: 5)
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 * @returns {object} - { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;

  const entry = rateLimitCache.get(key);

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    const resetTime = now + windowMs;
    rateLimitCache.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  }

  // Within window
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

/**
 * Get client IP from request
 * Handles Vercel's x-forwarded-for header
 */
export function getClientIP(request: Request): string {
  // Try to get IP from headers (Vercel/Cloudflare compatible)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback to a default (for local dev)
  return "unknown";
}
