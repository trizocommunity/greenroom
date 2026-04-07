import assert from "node:assert/strict";
import { test } from "node:test";
import { notificationEventSequenceFromId } from "@/server/services/notification.service";

test("derives stable numeric sequence from event id", () => {
  const eventId = "550e8400-e29b-41d4-a716-446655440000";
  const sequence = notificationEventSequenceFromId(eventId);
  assert.equal(sequence, 0x55440000);
});
