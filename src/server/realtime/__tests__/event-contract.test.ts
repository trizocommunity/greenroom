import assert from "node:assert/strict";
import { test } from "node:test";
import { createIdempotencyKey } from "@/server/realtime/events";

test("creates stable idempotency keys", () => {
  const key = createIdempotencyKey({
    eventName: "standings.updated",
    entityId: "festival-1",
    sequence: 7,
  });
  assert.equal(key, "standings.updated:festival-1:7");
});
