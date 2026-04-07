import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizeRealtimeRoomJoin } from "@/server/realtime/authz";

test("allows public standings room without principal", () => {
  const allowed = authorizeRealtimeRoomJoin(
    null,
    "festival:f-1:public:standings",
  );
  assert.equal(allowed, true);
});

test("blocks private room without principal", () => {
  const allowed = authorizeRealtimeRoomJoin(null, "festival:f-1:all");
  assert.equal(allowed, false);
});
