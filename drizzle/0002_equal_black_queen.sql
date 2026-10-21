CREATE TABLE "artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"type" varchar(100) NOT NULL,
	"relative_path" text NOT NULL,
	"storage_uri" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"url" text NOT NULL,
	"domain" varchar(255) NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content_hash" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"provider" varchar(100) NOT NULL,
	"model" varchar(255) NOT NULL,
	"prompt_version" varchar(100) NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"schema_valid" boolean NOT NULL,
	"status" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_run_id_migration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."migration_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD CONSTRAINT "evidence_sources_run_id_migration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."migration_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_run_id_migration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."migration_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_step_id_run_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."run_steps"("id") ON DELETE cascade ON UPDATE no action;