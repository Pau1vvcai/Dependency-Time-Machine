import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  assertRepositoryAllowed,
  assertSupportedRepository,
  inspectRepository,
  normalizeRepositoryUrl,
} from "./index";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  );
});

describe("repository validation", () => {
  it("normalizes a GitHub repository URL", () => {
    expect(normalizeRepositoryUrl("https://github.com/acme/demo.git/")).toBe(
      "https://github.com/acme/demo",
    );
  });

  it("rejects non-GitHub URLs and repositories outside the allowlist", () => {
    expect(() => normalizeRepositoryUrl("https://example.com/acme/demo")).toThrow();
    expect(() =>
      assertRepositoryAllowed(
        "https://github.com/acme/demo",
        "https://github.com/acme/other",
      ),
    ).toThrow(/not present/);
  });

  it("inspects a supported Next.js 14 TypeScript repository", async () => {
    const root = await createFixture({ lockfiles: ["pnpm-lock.yaml"] });
    const inspection = await inspectRepository(root);
    expect(inspection.packageManager).toBe("pnpm");
    expect(inspection.nextMajor).toBe(14);
    expect(inspection.sourceFiles).toContain("app/page.tsx");
    expect(() => assertSupportedRepository(inspection)).not.toThrow();
  });

  it("rejects repositories with multiple lockfiles", async () => {
    const root = await createFixture({
      lockfiles: ["pnpm-lock.yaml", "package-lock.json"],
    });
    await expect(inspectRepository(root)).rejects.toThrow(/multiple lockfiles/);
  });
});

async function createFixture(options: { lockfiles: string[] }): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "repository-test-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "app"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      dependencies: { next: "14.2.33" },
      scripts: { build: "next build" },
    }),
  );
  await writeFile(join(root, "tsconfig.json"), "{}");
  await writeFile(join(root, "app/page.tsx"), "export default function Page() {}\n");
  await Promise.all(
    options.lockfiles.map((name) => writeFile(join(root, name), "")),
  );
  return root;
}
