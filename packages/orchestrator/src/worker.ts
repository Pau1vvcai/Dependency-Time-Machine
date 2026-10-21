import { closeDatabase } from "@dependency-time-machine/database";
import { RunIdSchema } from "@dependency-time-machine/shared";

import { runBaselineMigration } from "./baseline";

const runIdArgument = process.argv.slice(2).find((argument) => argument !== "--");
const parsedRunId = RunIdSchema.safeParse(runIdArgument);
if (!parsedRunId.success) {
  console.error("Usage: pnpm worker:baseline <migration-run-uuid>");
  process.exitCode = 1;
} else {
  runBaselineMigration(parsedRunId.data)
    .then((result) => {
      console.log(
        JSON.stringify(
          {
            packageManager: result.inspection.packageManager,
            nextVersion: result.inspection.nextVersion,
            commands: result.results.map(({ name, status, exitCode }) => ({
              name,
              status,
              exitCode,
            })),
          },
          null,
          2,
        ),
      );
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(closeDatabase);
}
