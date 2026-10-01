"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type CreateRunResponse = {
  run?: {
    id: string;
  };
  error?: {
    message?: string;
  };
};

export function CreateRunForm() {
  const router = useRouter();
  const [repositoryUrl, setRepositoryUrl] = useState(
    "https://github.com/Pau1vvcai/Dependency-Time-Machine",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repositoryUrl,
          targetFramework: "nextjs",
          targetVersion: "16",
        }),
      });

      const result = (await response.json()) as CreateRunResponse;

      if (!response.ok || !result.run) {
        throw new Error(
          result.error?.message ?? "Unable to create the migration run.",
        );
      }

      router.push(`/runs/${result.run.id}`);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create the migration run.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6"
    >
      <label
        htmlFor="repository"
        className="block text-sm font-medium text-slate-200"
      >
        GitHub repository URL
      </label>

      <input
        id="repository"
        name="repository"
        type="url"
        required
        value={repositoryUrl}
        onChange={(event) => setRepositoryUrl(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
      />

      <div className="mt-6">
        <p className="text-sm font-medium text-slate-200">Target version</p>
        <p className="mt-2 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3">
          Next.js 16
        </p>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Creating migration run..." : "Start migration"}
      </button>

      <p className="mt-4 text-sm text-slate-400">
        Only allowlisted public TypeScript repositories are currently
        supported. Code runs in an isolated environment.
      </p>
    </form>
  );
}
