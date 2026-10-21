import { describe, expect, it } from "vitest";

import {
  assertTransition,
  canTransition,
} from "./index";

describe("migration run state machine", () => {
  it("allows the normal first transition", () => {
    expect(canTransition("QUEUED", "CLONING")).toBe(true);
  });

  it("allows verification success and failure paths", () => {
    expect(canTransition("VERIFYING", "REPORTING")).toBe(true);
    expect(canTransition("VERIFYING", "DIAGNOSING")).toBe(true);
  });

  it("allows retrying after diagnosis", () => {
    expect(canTransition("DIAGNOSING", "PATCHING")).toBe(true);
  });

  it("allows operational failures to enter reporting", () => {
    expect(canTransition("CLONING", "REPORTING")).toBe(true);
    expect(canTransition("BASELINE_TESTING", "REPORTING")).toBe(true);
  });

  it("rejects skipping intermediate states", () => {
    expect(canTransition("QUEUED", "PLANNING")).toBe(false);
    expect(() => assertTransition("QUEUED", "PLANNING")).toThrow(
      "Invalid migration run transition: QUEUED -> PLANNING",
    );
  });

  it("keeps terminal states terminal", () => {
    expect(canTransition("COMPLETED", "QUEUED")).toBe(false);
    expect(canTransition("FAILED", "QUEUED")).toBe(false);
  });
});
