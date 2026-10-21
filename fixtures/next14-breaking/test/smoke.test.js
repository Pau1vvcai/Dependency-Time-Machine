import assert from "node:assert/strict";
import test from "node:test";

test("this command must not run after lint fails", () => {
  assert.fail("test command ran after lint failure");
});
