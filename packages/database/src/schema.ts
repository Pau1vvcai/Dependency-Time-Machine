import { MIGRATION_RUN_STATUSES } from "@dependency-time-machine/shared";

import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";

export const migrationRunStatus = pgEnum(
  "migration_run_status",
  MIGRATION_RUN_STATUSES,
);

export const migrationRuns = pgTable("migration_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  repositoryUrl: text("repository_url").notNull(),
  targetFramework: varchar("target_framework", { length: 50 }).notNull(),
  targetVersion: varchar("target_version", { length: 50 }).notNull(),
  status: migrationRunStatus("status").default("QUEUED").notNull(),
  currentStep: varchar("current_step", { length: 100 }),
  attemptCount: integer("attempt_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
});

export type MigrationRun = typeof migrationRuns.$inferSelect;
export type NewMigrationRun = typeof migrationRuns.$inferInsert;

export const runStepStatus = pgEnum("run_step_status", [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "SKIPPED",
]);

export const commandRunStatus = pgEnum("command_run_status", [
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "TIMED_OUT",
  "SKIPPED",
]);

export const runSteps = pgTable("run_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => migrationRuns.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(),
  status: runStepStatus("status").default("PENDING").notNull(),
  inputJson: jsonb("input_json"),
  outputJson: jsonb("output_json"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const commandRuns = pgTable("command_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => migrationRuns.id, { onDelete: "cascade" }),
  stepId: uuid("step_id")
    .notNull()
    .references(() => runSteps.id, { onDelete: "cascade" }),
  commandName: varchar("command_name", { length: 100 }).notNull(),
  commandArgvJson: jsonb("command_argv_json").$type<string[]>().notNull(),
  exitCode: integer("exit_code"),
  durationMs: integer("duration_ms"),
  stdoutUri: text("stdout_uri"),
  stderrUri: text("stderr_uri"),
  status: commandRunStatus("status").default("PENDING").notNull(),
});

export type RunStep = typeof runSteps.$inferSelect;
export type NewRunStep = typeof runSteps.$inferInsert;
export type CommandRun = typeof commandRuns.$inferSelect;
export type NewCommandRun = typeof commandRuns.$inferInsert;