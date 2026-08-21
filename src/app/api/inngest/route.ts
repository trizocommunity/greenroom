import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { inngestFunctions } from "@/inngest/functions";

/**
 * Inngest webhook handler. Inngest calls this route on every event delivery,
 * cron tick, and step retry. The route must:
 *
 * - Run on Node runtime (ioredis requires Node — `runtime` is omitted so the
 *   project default of Node applies).
 * - Export the `GET` (introspection), `POST` (event delivery), and `PUT`
 *   (function update) handlers from `serve()`.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
