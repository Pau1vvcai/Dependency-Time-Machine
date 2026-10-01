import { z } from "zod";

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
