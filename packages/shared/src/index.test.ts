import { describe, expect, it } from "vitest";

import { StartMigrationInputSchema } from "./index";

describe("StartMigrationInputSchema", () => {
  it("accepts a public GitHub repository targeting Next.js 16", () => {
    const result = StartMigrationInputSchema.safeParse({
      repositoryUrl: "https://github.com/vercel/next.js",
      targetFramework: "nextjs",
      targetVersion: "16",
    });

    expect(result.success).toBe(true);
  });

  it("rejects repositories outside GitHub", () => {
    const result = StartMigrationInputSchema.safeParse({
      repositoryUrl: "https://gitlab.com/example/project",
      targetFramework: "nextjs",
      targetVersion: "16",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unsupported target versions", () => {
    const result = StartMigrationInputSchema.safeParse({
      repositoryUrl: "https://github.com/example/project",
      targetFramework: "nextjs",
      targetVersion: "15",
    });

    expect(result.success).toBe(false);
  });
});
