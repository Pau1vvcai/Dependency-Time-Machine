import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import type { PackageManager } from "@dependency-time-machine/repository";

export type CommandName = "install" | "typecheck" | "lint" | "test" | "build";
export type CommandStatus =
  | "SUCCEEDED"
  | "FAILED"
  | "TIMED_OUT"
  | "SKIPPED";

export type CommandSpec = {
  name: CommandName;
  executable: string;
  args: string[];
  timeoutMs: number;
};

export type CommandResult = CommandSpec & {
  status: CommandStatus;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
};

const COMMAND_ORDER: CommandName[] = [
  "install",
  "typecheck",
  "lint",
  "test",
  "build",
];

export function getCommandSpec(
  name: CommandName,
  packageManager: PackageManager,
  scripts: Record<string, string>,
): CommandSpec | null {
  if (name === "install") {
    return packageManager === "pnpm"
      ? {
          name,
          executable: "pnpm",
          args: ["install", "--frozen-lockfile", "--ignore-scripts"],
          timeoutMs: 300_000,
        }
      : {
          name,
          executable: "npm",
          args: ["ci", "--ignore-scripts"],
          timeoutMs: 300_000,
        };
  }

  if (!scripts[name]) return null;
  return {
    name,
    executable: packageManager,
    args: ["run", name],
    timeoutMs: 120_000,
  };
}

export function buildDockerRunArgs(input: {
  containerName: string;
  image: string;
  repositoryPath: string;
  command: CommandSpec;
}): string[] {
  return [
    "run",
    "--rm",
    "--name",
    input.containerName,
    "--cpus",
    "1",
    "--memory",
    "1g",
    "--pids-limit",
    "256",
    "--network",
    input.command.name === "install" ? "bridge" : "none",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--read-only",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=256m",
    "--env",
    "HOME=/tmp/runner",
    "--env",
    "npm_config_cache=/tmp/npm-cache",
    "--mount",
    `type=bind,src=${resolve(input.repositoryPath)},dst=/workspace`,
    "--workdir",
    "/workspace",
    input.image,
    input.command.executable,
    ...input.command.args,
  ];
}

export async function runBaseline(input: {
  repositoryPath: string;
  packageManager: PackageManager;
  scripts: Record<string, string>;
  image?: string;
}): Promise<CommandResult[]> {
  const results: CommandResult[] = [];
  for (const name of COMMAND_ORDER) {
    const spec = getCommandSpec(name, input.packageManager, input.scripts);
    if (!spec) {
      results.push({
        name,
        executable: input.packageManager,
        args: [],
        timeoutMs: 0,
        status: "SKIPPED",
        exitCode: null,
        durationMs: 0,
        stdout: "",
        stderr: `Script ${name} is not defined.`,
      });
      continue;
    }
    const result = await runDockerCommand({
      repositoryPath: input.repositoryPath,
      command: spec,
      image: input.image ?? "dtm-runner:local",
    });
    results.push(result);
    if (result.status !== "SUCCEEDED") break;
  }
  return results;
}

export function redactLog(value: string): string {
  return value.replace(
    /\b(api[_-]?key|token|secret|password)\s*[=:]\s*[^\s]+/gi,
    "$1=[REDACTED]",
  );
}

async function runDockerCommand(input: {
  repositoryPath: string;
  command: CommandSpec;
  image: string;
}): Promise<CommandResult> {
  const containerName = `dtm-${randomUUID()}`;
  const args = buildDockerRunArgs({ ...input, containerName });
  const startedAt = Date.now();

  return new Promise((resolvePromise) => {
    const child = spawn("docker", args, {
      shell: false,
      env: { PATH: process.env.PATH ?? "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const finish = (result: CommandResult) => {
      if (settled) return;
      settled = true;
      resolvePromise(result);
    };
    const append = (current: string, chunk: Buffer) =>
      `${current}${chunk.toString()}`.slice(-1_000_000);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = append(stderr, chunk);
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
      const cleanup = spawn("docker", ["rm", "-f", containerName], {
        shell: false,
        env: { PATH: process.env.PATH ?? "" },
        stdio: "ignore",
      });
      cleanup.unref();
    }, input.command.timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      finish({
        ...input.command,
        status: "FAILED",
        exitCode: null,
        durationMs: Date.now() - startedAt,
        stdout: redactLog(stdout),
        stderr: redactLog(`${stderr}\n${error.message}`),
      });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      finish({
        ...input.command,
        status: timedOut ? "TIMED_OUT" : code === 0 ? "SUCCEEDED" : "FAILED",
        exitCode: code,
        durationMs: Date.now() - startedAt,
        stdout: redactLog(stdout),
        stderr: redactLog(stderr),
      });
    });
  });
}
