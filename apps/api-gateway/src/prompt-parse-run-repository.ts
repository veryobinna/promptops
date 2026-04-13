import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { PromptParseResponse, PromptParseRunRecord } from "@promptops/shared-types";

const baseDir = dirname(fileURLToPath(import.meta.url));
const defaultStorageDir = join(baseDir, "..", ".promptops-data", "prompt-parse-runs");

function storageDir(): string {
  return process.env.API_GATEWAY_DATA_DIR ?? defaultStorageDir;
}

function runFilePath(id: string): string {
  return join(storageDir(), `${id}.json`);
}

async function ensureStorageDir(): Promise<void> {
  await mkdir(storageDir(), {
    recursive: true,
  });
}

export async function savePromptParseRun(run: PromptParseRunRecord): Promise<void> {
  await ensureStorageDir();
  await writeFile(runFilePath(run.id), JSON.stringify(run, null, 2), "utf8");
}

export async function readPromptParseRun(id: string): Promise<PromptParseRunRecord | null> {
  try {
    const contents = await readFile(runFilePath(id), "utf8");
    return JSON.parse(contents) as PromptParseRunRecord;
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

export async function listPromptParseRuns(): Promise<PromptParseRunRecord[]> {
  await ensureStorageDir();

  const entries = await readdir(storageDir(), {
    withFileTypes: true,
  });

  const runs = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const contents = await readFile(join(storageDir(), entry.name), "utf8");
        return JSON.parse(contents) as PromptParseRunRecord;
      }),
  );

  return runs.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function updatePromptParseRunSpec(
  id: string,
  spec: PromptParseRunRecord["spec"],
): Promise<PromptParseRunRecord | null> {
  const existing = await readPromptParseRun(id);

  if (!existing) {
    return null;
  }

  const updatedRun: PromptParseRunRecord = {
    ...existing,
    spec,
    updatedAt: new Date().toISOString(),
  };

  await savePromptParseRun(updatedRun);
  return updatedRun;
}

export function toPromptParseRunRecord(
  id: string,
  payload: PromptParseResponse,
  createdAt = new Date().toISOString(),
): PromptParseRunRecord {
  return {
    id,
    status: "completed",
    createdAt,
    updatedAt: createdAt,
    ...payload,
  };
}
