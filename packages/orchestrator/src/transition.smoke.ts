import assert from "node:assert/strict";

import {
  closeDatabase,
  db,
  migrationRuns,
} from "@dependency-time-machine/database";
import { eq } from "drizzle-orm";

import { transitionMigrationRun } from "./index";

let runId: string | undefined;

async function main() {
  const [createdRun] = await db
    .insert(migrationRuns)
    .values({
      repositoryUrl: "https://github.com/vercel/next.js",
      targetFramework: "nextjs",
      targetVersion: "16",
    })
    .returning();

  assert(createdRun);
  runId = createdRun.id;

  const updatedRun = await transitionMigrationRun(
    createdRun.id,
    "CLONING",
  );

  assert.equal(updatedRun.status, "CLONING");
  assert(updatedRun.startedAt);

  await assert.rejects(
    transitionMigrationRun(createdRun.id, "PLANNING"),
    /Invalid migration run transition/,
  );

  const [reloadedRun] = await db
    .select()
    .from(migrationRuns)
    .where(eq(migrationRuns.id, createdRun.id))
    .limit(1);

  assert(reloadedRun);
  assert.equal(reloadedRun.status, "CLONING");

  console.log({
    id: reloadedRun.id,
    persistedStatus: reloadedRun.status,
    invalidTransitionRejected: true,
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (runId) {
      await db.delete(migrationRuns).where(eq(migrationRuns.id, runId));
    }

    await closeDatabase();
  });