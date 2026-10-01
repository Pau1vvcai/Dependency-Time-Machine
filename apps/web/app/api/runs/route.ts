import { db, migrationRuns } from "@dependency-time-machine/database";
import { StartMigrationInputSchema } from "@dependency-time-machine/shared";

function normalizeRepositoryUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  const parsed = StartMigrationInputSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "The migration request is invalid.",
          issues: parsed.error.issues,
        },
      },
      { status: 400 },
    );
  }

  const allowedRepositories = new Set(
    (process.env.ALLOWED_REPOSITORIES ?? "")
      .split(",")
      .map((value) => normalizeRepositoryUrl(value.trim()))
      .filter(Boolean),
  );

  const repositoryUrl = normalizeRepositoryUrl(
    parsed.data.repositoryUrl,
  );

  if (!allowedRepositories.has(repositoryUrl)) {
    return Response.json(
      {
        error: {
          code: "REPOSITORY_NOT_ALLOWED",
          message: "The repository is not on the allowlist.",
        },
      },
      { status: 403 },
    );
  }

  const [run] = await db
    .insert(migrationRuns)
    .values({
      repositoryUrl,
      targetFramework: parsed.data.targetFramework,
      targetVersion: parsed.data.targetVersion,
    })
    .returning();

  return Response.json({ run }, { status: 201 });
}
