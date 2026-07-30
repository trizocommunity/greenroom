import { z } from "zod";

export const healthCheckResponse = z.object({
  status: z.string(),
  timestamp: z.string(),
  version: z.string(),
});

export const verboseHealthCheckResponse = z.object({
  status: z.string(),
  timestamp: z.string(),
  checks: z.record(
    z.object({
      status: z.string(),
      latency: z.number().optional(),
    }),
  ),
});

export const verboseHealthCheckInput = z.object({
  check: z.enum(["db", "all"]).optional().default("all"),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponse>;
export type VerboseHealthCheckResponse = z.infer<
  typeof verboseHealthCheckResponse
>;
export type VerboseHealthCheckInput = z.infer<typeof verboseHealthCheckInput>;
