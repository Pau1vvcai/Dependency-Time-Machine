import {
  db,
  migrationRuns,
  runSteps,
} from "@dependency-time-machine/database";
import { RunIdSchema } from "@dependency-time-machine/shared";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function RunDetailsPage({
  params,
}: PageProps<"/runs/[id]">) {
  const { id } = await params;
  const parsedId = RunIdSchema.safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const [run] = await db
    .select()
    .from(migrationRuns)
    .where(eq(migrationRuns.id, parsedId.data))
    .limit(1);

  if (!run) {
    notFound();
  }

  const steps = await db
    .select()
    .from(runSteps)
    .where(eq(runSteps.runId, run.id))
    .orderBy(asc(runSteps.startedAt), asc(runSteps.id));

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-cyan-400 hover:underline">
          ← Back to home
        </Link>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              Migration run
            </p>
            <h1 className="mt-2 text-3xl font-bold">Run details</h1>
          </div>

          <span className="rounded-full bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300">
            {run.status}
          </span>
        </div>

        <dl className="mt-10 divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900 px-6">
          <div className="py-5">
            <dt className="text-sm text-slate-400">Run ID</dt>
            <dd className="mt-1 break-all font-mono text-sm">{run.id}</dd>
          </div>

          <div className="py-5">
            <dt className="text-sm text-slate-400">Repository</dt>
            <dd className="mt-1 break-all">{run.repositoryUrl}</dd>
          </div>

          <div className="py-5">
            <dt className="text-sm text-slate-400">Target</dt>
            <dd className="mt-1">
              {run.targetFramework} {run.targetVersion}
            </dd>
          </div>

          <div className="py-5">
            <dt className="text-sm text-slate-400">Created</dt>
            <dd className="mt-1">{run.createdAt.toISOString()}</dd>
          </div>

          <div className="py-5">
            <dt className="text-sm text-slate-400">Attempts</dt>
            <dd className="mt-1">{run.attemptCount}</dd>
          </div>
        </dl>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Execution timeline</h2>
          <ol className="mt-4 space-y-3">
            {steps.map((step) => (
              <li
                key={step.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-5 py-4"
              >
                <span className="font-medium">{step.type}</span>
                <span className="text-sm text-slate-400">{step.status}</span>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
}
