import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

export type PackageManager = "npm" | "pnpm";

export type RepositoryInspection = {
  packageManager: PackageManager;
  nextVersion: string;
  nextMajor: number;
  hasTypeScript: boolean;
  nextConfig: string | null;
  sourceFiles: string[];
  scripts: Record<string, string>;
};

const LOCKFILES = {
  "pnpm-lock.yaml": "pnpm",
  "package-lock.json": "npm",
} as const;

const NEXT_CONFIG_FILES = [
  "next.config.ts",
  "next.config.mjs",
  "next.config.js",
  "next.config.cjs",
] as const;

export class RepositoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepositoryValidationError";
  }
}

export function normalizeRepositoryUrl(value: string): string {
  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new RepositoryValidationError(
      "Repository URL must be a plain HTTPS github.com URL.",
    );
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2) {
    throw new RepositoryValidationError(
      "Repository URL must contain exactly an owner and repository.",
    );
  }

  const repository = segments[1]!.replace(/\.git$/, "");
  if (!repository) {
    throw new RepositoryValidationError("Repository name is required.");
  }

  return `https://github.com/${segments[0]}/${repository}`;
}

export function parseRepositoryAllowlist(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map(normalizeRepositoryUrl),
  );
}

export function assertRepositoryAllowed(
  repositoryUrl: string,
  allowlistValue: string | undefined,
): string {
  const normalized = normalizeRepositoryUrl(repositoryUrl);
  const allowlist = parseRepositoryAllowlist(allowlistValue);

  if (!allowlist.has(normalized)) {
    throw new RepositoryValidationError(
      "Repository is not present in ALLOWED_REPOSITORIES.",
    );
  }

  return normalized;
}

export async function createTemporaryWorkspace(root?: string): Promise<string> {
  const parent = resolve(root ?? tmpdir());
  await mkdir(parent, { recursive: true });
  return mkdtemp(join(parent, "dtm-"));
}

export async function removeTemporaryWorkspace(path: string): Promise<void> {
  if (basename(path).startsWith("dtm-")) {
    await rm(path, { recursive: true, force: true });
  }
}

export async function cloneRepository(
  repositoryUrl: string,
  destination: string,
  timeoutMs = 120_000,
): Promise<void> {
  await runProcess(
    "git",
    ["clone", "--depth", "1", "--", repositoryUrl, destination],
    timeoutMs,
  );
}

export async function inspectRepository(
  repositoryPath: string,
): Promise<RepositoryInspection> {
  const entries = new Set(await readdir(repositoryPath));
  const lockfiles = Object.entries(LOCKFILES).filter(([name]) =>
    entries.has(name),
  );

  if (lockfiles.length !== 1) {
    throw new RepositoryValidationError(
      lockfiles.length === 0
        ? "Repository must contain one supported lockfile."
        : "Repository contains multiple lockfiles.",
    );
  }

  const packageJson = JSON.parse(
    await readFile(join(repositoryPath, "package.json"), "utf8"),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  const nextVersion =
    packageJson.dependencies?.next ?? packageJson.devDependencies?.next;

  if (!nextVersion) {
    throw new RepositoryValidationError("Repository does not depend on Next.js.");
  }

  const majorMatch = nextVersion.match(/(?:^|[^\d])(\d+)(?:\.|$)/);
  const nextMajor = majorMatch ? Number(majorMatch[1]) : Number.NaN;
  const hasTypeScript = entries.has("tsconfig.json");
  const nextConfig = NEXT_CONFIG_FILES.find((name) => entries.has(name)) ?? null;
  const sourceFiles = await listSourceFiles(repositoryPath);

  return {
    packageManager: lockfiles[0]![1],
    nextVersion,
    nextMajor,
    hasTypeScript,
    nextConfig,
    sourceFiles,
    scripts: packageJson.scripts ?? {},
  };
}

export function assertSupportedRepository(
  inspection: RepositoryInspection,
): void {
  if (!inspection.hasTypeScript) {
    throw new RepositoryValidationError("Repository must use TypeScript.");
  }
  if (![14, 15].includes(inspection.nextMajor)) {
    throw new RepositoryValidationError(
      "Repository must use Next.js 14 or 15.",
    );
  }
}

async function listSourceFiles(repositoryPath: string): Promise<string[]> {
  const roots = ["app", "pages", "src/app", "src/pages"];
  const files: string[] = [];

  async function walk(relativePath: string): Promise<void> {
    if (files.length >= 100) return;
    let entries;
    try {
      entries = await readdir(join(repositoryPath, relativePath), {
        withFileTypes: true,
      });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= 100) break;
      const child = join(relativePath, entry.name);
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile()) files.push(child);
    }
  }

  for (const root of roots) await walk(root);
  return files.sort();
}

function runProcess(
  executable: string,
  args: string[],
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-16_384);
    });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("error", rejectPromise);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise();
      else {
        rejectPromise(
          new Error(
            `git clone failed (${signal ?? code ?? "unknown"}): ${stderr}`,
          ),
        );
      }
    });
  });
}
