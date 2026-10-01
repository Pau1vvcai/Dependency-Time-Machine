import type { MigrationRunStatus } from "@dependency-time-machine/shared";
import { db, migrationRuns } from "@dependency-time-machine/database";
import { and, eq } from "drizzle-orm";

export const ALLOWED_TRANSITIONS = {
  QUEUED: ["CLONING"],
  CLONING: ["INSPECTING"],
  INSPECTING: ["BASELINE_TESTING"],
  BASELINE_TESTING: ["RESEARCHING"],
  RESEARCHING: ["PLANNING"],
  PLANNING: ["UPDATING_DEPENDENCIES"],
  UPDATING_DEPENDENCIES: ["PATCHING"],
  PATCHING: ["VERIFYING"],
  VERIFYING: ["REPORTING", "DIAGNOSING"],
  DIAGNOSING: ["PATCHING", "REPORTING"],
  REPORTING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
} as const satisfies Record<
  MigrationRunStatus,
  readonly MigrationRunStatus[]
>;

export function canTransition(
  from: MigrationRunStatus,
  to: MigrationRunStatus,
): boolean {
  const allowed = ALLOWED_TRANSITIONS[from] as readonly MigrationRunStatus[];

  return allowed.includes(to);
}

export function assertTransition(
  from: MigrationRunStatus,
  to: MigrationRunStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid migration run transition: ${from} -> ${to}`);
  }
}

export async function transitionMigrationRun(
  runId: string,
  to: MigrationRunStatus,
) {
  const [currentRun] = await db
    .select()
    .from(migrationRuns)
    .where(eq(migrationRuns.id, runId))
    .limit(1);

  if (!currentRun) {
    throw new Error(`Migration run not found: ${runId}`);
  }

  assertTransition(currentRun.status, to);

  const isTerminal = to === "COMPLETED" || to === "FAILED";

  const [updatedRun] = await db
    .update(migrationRuns)
    .set({
      status: to,
      currentStep: to,
      startedAt: currentRun.startedAt ?? new Date(),
      completedAt: isTerminal ? new Date() : currentRun.completedAt,
    })
    .where(
      and(
        eq(migrationRuns.id, runId),
        eq(migrationRuns.status, currentRun.status),
      ),
    )
    .returning();

  if (!updatedRun) {
    throw new Error(
      `Migration run changed concurrently: ${runId}`,
    );
  }

  return updatedRun;
}