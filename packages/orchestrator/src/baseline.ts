import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  commandRuns,
  db,
  migrationRuns,
  runSteps,
} from "@dependency-time-machine/database";
import { runBaseline, type CommandResult } from "@dependency-time-machine/executor";
import {
  assertRepositoryAllowed,
  assertSupportedRepository,
  cloneRepository,
  createTemporaryWorkspace,
  inspectRepository,
  removeTemporaryWorkspace,
} from "@dependency-time-machine/repository";
import { and, eq } from "drizzle-orm";

import { canTransition, transitionMigrationRun } from "./state-machine";

const PROJECT_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

export async function runBaselineMigration(runId: string) {
  const [run] = await db
    .select()
    .from(migrationRuns)
    .where(eq(migrationRuns.id, runId))
    .limit(1);
  if (!run) throw new Error(`Migration run not found: ${runId}`);
  if (run.status !== "QUEUED") {
    throw new Error(`Migration run must be QUEUED, received ${run.status}.`);
  }

  const repositoryUrl = assertRepositoryAllowed(
    run.repositoryUrl,
    process.env.ALLOWED_REPOSITORIES,
  );
  const workspaceRoot = resolveConfiguredPath(
    process.env.WORKSPACE_ROOT,
    ".dtm/workspaces",
  );
  const artifactRoot = resolveConfiguredPath(
    process.env.ARTIFACT_STORAGE_ROOT,
    ".dtm/artifacts",
  );
  const temporaryWorkspace = await createTemporaryWorkspace(workspaceRoot);
  const repositoryPath = join(temporaryWorkspace, "repository");

  try {
    await transitionMigrationRun(runId, "CLONING");
    const cloningStepId = await beginStep(runId, "CLONING");
    await cloneRepository(repositoryUrl, repositoryPath);
    await completeStep(cloningStepId, { repositoryUrl });

    await transitionMigrationRun(runId, "INSPECTING");
    const inspectingStepId = await beginStep(runId, "INSPECTING");
    const inspection = await inspectRepository(repositoryPath);
    assertSupportedRepository(inspection);
    await completeStep(inspectingStepId, inspection);

    await transitionMigrationRun(runId, "BASELINE_TESTING");
    const baselineStepId = await beginStep(runId, "BASELINE_TESTING");
    const results = await runBaseline({
      repositoryPath,
      packageManager: inspection.packageManager,
      scripts: inspection.scripts,
    });
    await persistCommandResults({
      runId,
      stepId: baselineStepId,
      artifactRoot,
      results,
    });

    const failedResult = results.find(
      (result) => !["SUCCEEDED", "SKIPPED"].includes(result.status),
    );
    if (failedResult) {
      throw new Error(
        `Baseline command ${failedResult.name} ${failedResult.status.toLowerCase()}.`,
      );
    }
    await completeStep(baselineStepId, { results });
    await transitionMigrationRun(runId, "RESEARCHING");
    await db.insert(runSteps).values({ runId, type: "RESEARCHING" });
    return { inspection, results };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown baseline error.";
    await db
      .update(runSteps)
      .set({ status: "FAILED", completedAt: new Date(), outputJson: { error: message } })
      .where(and(eq(runSteps.runId, runId), eq(runSteps.status, "RUNNING")));
    await failMigrationRun(runId, message);
    throw error;
  } finally {
    await removeTemporaryWorkspace(temporaryWorkspace);
  }
}

async function beginStep(runId: string, type: string): Promise<string> {
  const [existing] = await db
    .select()
    .from(runSteps)
    .where(and(eq(runSteps.runId, runId), eq(runSteps.type, type)))
    .limit(1);
  if (existing) {
    const [updated] = await db
      .update(runSteps)
      .set({ status: "RUNNING", startedAt: new Date() })
      .where(eq(runSteps.id, existing.id))
      .returning();
    if (!updated) throw new Error(`Unable to start step ${type}.`);
    return updated.id;
  }
  const [created] = await db
    .insert(runSteps)
    .values({ runId, type, status: "RUNNING", startedAt: new Date() })
    .returning();
  if (!created) throw new Error(`Unable to create step ${type}.`);
  return created.id;
}

async function completeStep(stepId: string, output: unknown): Promise<void> {
  await db
    .update(runSteps)
    .set({ status: "COMPLETED", completedAt: new Date(), outputJson: output })
    .where(eq(runSteps.id, stepId));
}

async function persistCommandResults(input: {
  runId: string;
  stepId: string;
  artifactRoot: string;
  results: CommandResult[];
}): Promise<void> {
  for (const result of input.results) {
    const stdoutUri = await writeLog(
      input.artifactRoot,
      input.runId,
      `${result.name}.stdout.log`,
      result.stdout,
    );
    const stderrUri = await writeLog(
      input.artifactRoot,
      input.runId,
      `${result.name}.stderr.log`,
      result.stderr,
    );
    await db.insert(commandRuns).values({
      runId: input.runId,
      stepId: input.stepId,
      commandName: result.name,
      commandArgvJson: [result.executable, ...result.args],
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      stdoutUri,
      stderrUri,
      status: result.status,
    });
  }
}

async function writeLog(
  artifactRoot: string,
  runId: string,
  filename: string,
  content: string,
): Promise<string> {
  const path = join(artifactRoot, runId, filename);
  await mkdir(dirname(path), { recursive: true });
  const decorated = `sha256:${createHash("sha256").update(content).digest("hex")}\n${content}`;
  await writeFile(path, decorated, { mode: 0o600 });
  return pathToFileURL(path).href;
}

async function failMigrationRun(runId: string, reason: string): Promise<void> {
  let [run] = await db
    .select()
    .from(migrationRuns)
    .where(eq(migrationRuns.id, runId))
    .limit(1);
  if (!run || ["COMPLETED", "FAILED"].includes(run.status)) return;
  if (run.status !== "REPORTING" && canTransition(run.status, "REPORTING")) {
    await transitionMigrationRun(runId, "REPORTING");
    [run] = await db
      .select()
      .from(migrationRuns)
      .where(eq(migrationRuns.id, runId))
      .limit(1);
  }
  await db
    .update(migrationRuns)
    .set({ failureReason: reason })
    .where(eq(migrationRuns.id, runId));
  if (run?.status === "REPORTING") {
    await transitionMigrationRun(runId, "FAILED");
  }
}

function resolveConfiguredPath(value: string | undefined, fallback: string): string {
  const configured = value?.trim() || fallback;
  return isAbsolute(configured) ? configured : resolve(PROJECT_ROOT, configured);
}
