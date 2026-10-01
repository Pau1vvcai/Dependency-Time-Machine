import { z } from "zod";

export const MIGRATION_RUN_STATUSES = [
  "QUEUED",
  "CLONING",
  "INSPECTING",
  "BASELINE_TESTING",
  "RESEARCHING",
  "PLANNING",
  "UPDATING_DEPENDENCIES",
  "PATCHING",
  "VERIFYING",
  "DIAGNOSING",
  "REPORTING",
  "COMPLETED",
  "FAILED",
] as const;

export const MigrationRunStatusSchema = z.enum(MIGRATION_RUN_STATUSES);

export type MigrationRunStatus = z.infer<
  typeof MigrationRunStatusSchema
>;

export const StartMigrationInputSchema = z.object({
  repositoryUrl: z
    .url()
    .refine((value) => new URL(value).hostname === "github.com", {
      message: "Repository URL must use github.com",
    }),
  targetFramework: z.literal("nextjs"),
  targetVersion: z.literal("16"),
});

export type StartMigrationInput = z.infer<
  typeof StartMigrationInputSchema
>;

export const RunIdSchema = z.uuid();