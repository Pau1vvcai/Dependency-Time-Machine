import { describe, expect, it } from "vitest";
import { buildDockerRunArgs, getCommandSpec, redactLog } from "./index";

describe("fixed command catalog", () => {
  it("uses a safe pnpm install command", () => {
    expect(getCommandSpec("install", "pnpm", {})).toMatchObject({
      executable: "pnpm",
      args: ["install", "--frozen-lockfile", "--ignore-scripts"],
    });
  });

  it("skips missing package scripts", () => {
    expect(getCommandSpec("test", "npm", {})).toBeNull();
  });

  it("builds a constrained Docker invocation without a Docker socket", () => {
    const command = getCommandSpec("build", "npm", { build: "next build" });
    expect(command).not.toBeNull();
    const args = buildDockerRunArgs({
      containerName: "dtm-test",
      image: "dtm-runner:local",
      repositoryPath: "/tmp/repository",
      command: command!,
    });
    expect(args).toContain("--read-only");
    expect(args).toContain("no-new-privileges");
    expect(args).toContain("none");
    expect(args.join(" ")).not.toContain("docker.sock");
  });

  it("redacts common secret assignments", () => {
    expect(redactLog("API_KEY=super-secret-value")).toBe(
      "API_KEY=[REDACTED]",
    );
  });
});
