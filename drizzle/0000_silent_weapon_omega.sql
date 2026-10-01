CREATE TYPE "public"."migration_run_status" AS ENUM('QUEUED', 'CLONING', 'INSPECTING', 'BASELINE_TESTING', 'RESEARCHING', 'PLANNING', 'UPDATING_DEPENDENCIES', 'PATCHING', 'VERIFYING', 'DIAGNOSING', 'REPORTING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "migration_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_url" text NOT NULL,
	"target_framework" varchar(50) NOT NULL,
	"target_version" varchar(50) NOT NULL,
	"status" "migration_run_status" DEFAULT 'QUEUED' NOT NULL,
	"current_step" varchar(100),
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failure_reason" text
);
