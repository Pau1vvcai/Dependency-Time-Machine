import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { inspectRepository } from "@dependency-time-machine/repository";

import { runBaseline } from "./index";

const cleanFixturePath = fileURLToPath(
  new URL("../../../fixtures/next14-clean", import.meta.url),
);
const cleanInspection = await inspectRepository(cleanFixturePath);
const results = await runBaseline({
  repositoryPath: cleanFixturePath,
  packageManager: cleanInspection.packageManager,
  scripts: cleanInspection.scripts,
});

assert(results.length > 0);
assert(
  results.every((result) => ["SUCCEEDED", "SKIPPED"].includes(result.status)),
  JSON.stringify(results, null, 2),
);

const breakingFixturePath = fileURLToPath(
  new URL("../../../fixtures/next14-breaking", import.meta.url),
);
const breakingInspection = await inspectRepository(breakingFixturePath);
const breakingResults = await runBaseline({
  repositoryPath: breakingFixturePath,
  packageManager: breakingInspection.packageManager,
  scripts: breakingInspection.scripts,
});
const failedLint = breakingResults.at(-1);
assert.equal(failedLint?.name, "lint");
assert.equal(failedLint?.status, "FAILED");
assert.equal(failedLint?.exitCode, 7);
assert.equal(
  breakingResults.some((result) => ["test", "build"].includes(result.name)),
  false,
);
console.log(
  JSON.stringify(
    {
      successfulBaseline: results.map(
        ({ name, status, exitCode, durationMs }) => ({
          name,
          status,
          exitCode,
          durationMs,
        }),
      ),
      failureStopsSequence: breakingResults.map(
        ({ name, status, exitCode, durationMs }) => ({
          name,
          status,
          exitCode,
          durationMs,
        }),
      ),
    },
    null,
    2,
  ),
);
