import assert from "node:assert/strict";

import { eq } from "drizzle-orm";

import { closeDatabase, db } from "./client";
import { migrationRuns } from "./schema";

async function main() {
  const [createdRun] = await db
    .insert(migrationRuns)
    .values({
      repositoryUrl: "https://github.com/vercel/next.js",
      targetFramework: "nextjs",
      targetVersion: "16",
    })
    .returning();

  assert(createdRun, "The migration run was not created");

  const [loadedRun] = await db
    .select()
    .from(migrationRuns)
    .where(eq(migrationRuns.id, createdRun.id))
    .limit(1);

  assert(loadedRun, "The migration run was not found");
  assert.equal(loadedRun.status, "QUEUED");
  assert.equal(loadedRun.targetVersion, "16");

  console.log({
    id: loadedRun.id,
    repositoryUrl: loadedRun.repositoryUrl,
    status: loadedRun.status,
  });

  await db.delete(migrationRuns).where(eq(migrationRuns.id, createdRun.id));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
