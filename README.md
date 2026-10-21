# Dependency Time Machine

Dependency Time Machine is a learning project that turns a public, allowlisted
Next.js repository into a traceable migration run. The web application creates
and displays runs; a separate worker clones and inspects source code and executes
a fixed baseline command set in an isolated Docker container.

## Current scope

- Create and inspect migration runs through the web UI and JSON API.
- Persist runs, steps, command results, evidence, artifacts, and model calls in
  PostgreSQL through Drizzle ORM.
- Enforce an explicit repository allowlist and HTTPS GitHub URLs.
- Inspect pnpm and npm Next.js 14/15 TypeScript projects.
- Run `install`, `typecheck`, `lint`, `test`, and `build` in a non-root Docker
  runner with CPU, memory, process, network, and capability restrictions.
- Store bounded, redacted command logs outside the database.

## Local setup

Requirements: Node.js 24, pnpm 12, Git, and Docker Desktop.

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm --filter @dependency-time-machine/database db:migrate
pnpm runner:build
pnpm dev
```

Before creating a run, set `ALLOWED_REPOSITORIES` in `.env` to a comma-separated
list of public repositories, for example:

```dotenv
ALLOWED_REPOSITORIES=https://github.com/example/next14-app
```

Open `http://localhost:3000`, create a run, copy its UUID, then start the baseline
worker in a second terminal:

```bash
pnpm worker:baseline -- <run-id>
```

The web server never executes repository code. Only the worker can invoke the
Docker runner. After the worker finishes, reload the run details page to see the
persisted timeline.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @dependency-time-machine/executor smoke
```

The executor smoke test runs both the passing and intentionally failing fixture
projects. It requires the `dtm-runner:local` image built above.

## Workspace layout

- `apps/web`: Next.js UI and run API.
- `packages/database`: Drizzle schema, database client, migrations, and smoke test.
- `packages/shared`: shared validation schemas and domain types.
- `packages/repository`: safe clone, allowlist, and repository inspection logic.
- `packages/executor`: fixed-command Docker executor and log controls.
- `packages/orchestrator`: state machine and baseline worker.
- `fixtures`: deterministic Next.js 14 projects for executor verification.
- `docker`: non-root runner image.
- `drizzle`: generated SQL migrations and snapshots.
