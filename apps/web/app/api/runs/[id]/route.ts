import { db, migrationRuns } from "@dependency-time-machine/database";
import { RunIdSchema } from "@dependency-time-machine/shared";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/runs/[id]">,
) {
  const { id } = await context.params;
  const parsedId = RunIdSchema.safeParse(id);

  if (!parsedId.success) {
    return Response.json(
      {
        error: {
          code: "INVALID_RUN_ID",
          message: "The migration run ID must be a valid UUID.",
        },
      },
      { status: 400 },
    );
  }

  const [run] = await db
    .select()
    .from(migrationRuns)
    .where(eq(migrationRuns.id, parsedId.data))
    .limit(1);

  if (!run) {
    return Response.json(
      {
        error: {
          code: "RUN_NOT_FOUND",
          message: "The migration run was not found.",
        },
      },
      { status: 404 },
    );
  }

  return Response.json({ run });
}
