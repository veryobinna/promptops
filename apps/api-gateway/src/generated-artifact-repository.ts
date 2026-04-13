import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { GeneratedArtifactBundle } from "@promptops/shared-types";

const baseDir = dirname(fileURLToPath(import.meta.url));
const defaultStorageDir = join(baseDir, "..", ".promptops-data", "generated-artifacts");

function storageDir(): string {
  return process.env.API_GATEWAY_ARTIFACTS_DIR ?? defaultStorageDir;
}

function artifactFilePath(runId: string): string {
  return join(storageDir(), `${runId}.json`);
}

async function ensureStorageDir(): Promise<void> {
  await mkdir(storageDir(), {
    recursive: true,
  });
}

export async function saveGeneratedArtifacts(bundle: GeneratedArtifactBundle): Promise<void> {
  await ensureStorageDir();
  await writeFile(artifactFilePath(bundle.runId), JSON.stringify(bundle, null, 2), "utf8");
}

export async function readGeneratedArtifacts(runId: string): Promise<GeneratedArtifactBundle | null> {
  try {
    const contents = await readFile(artifactFilePath(runId), "utf8");
    return JSON.parse(contents) as GeneratedArtifactBundle;
  } catch (error) {
    const isMissing =
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code === "ENOENT";

    if (isMissing) {
      return null;
    }

    throw error;
  }
}

export async function deleteGeneratedArtifacts(runId: string): Promise<void> {
  try {
    await unlink(artifactFilePath(runId));
  } catch (error) {
    const isMissing =
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code === "ENOENT";

    if (!isMissing) {
      throw error;
    }
  }
}
