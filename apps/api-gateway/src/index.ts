import { createServer, request as httpRequest } from "node:http";
import type { IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import type {
  HealthResponse,
  PromptParseRequest,
  PromptParseResponse,
  PromptParseRunEnvelope,
  PromptParseRunListResponse,
  PromptParseRunSpecUpdateRequest,
} from "@promptops/shared-types";
import { isDeploymentSpec } from "@promptops/shared-types";
import {
  deletePromptParseRun,
  listPromptParseRuns,
  readPromptParseRun,
  savePromptParseRun,
  toPromptParseRunRecord,
  updatePromptParseRunSpec,
} from "./prompt-parse-run-repository.js";

export const apiGatewayManifest = {
  name: "api-gateway",
  responsibility: "Public backend boundary for the web app and external API clients.",
} as const;

const DEFAULT_PORT = 4000;
const DEFAULT_GENERATOR_URL = "http://127.0.0.1:4001";

function readPort(): number {
  const rawPort = process.env.PORT;

  if (!rawPort) {
    return DEFAULT_PORT;
  }

  const parsed = Number(rawPort);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function generatorBaseUrl(): string {
  return process.env.GENERATOR_SERVICE_URL ?? DEFAULT_GENERATOR_URL;
}

function json<T>(statusCode: number, body: T) {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function isPromptParseRequest(value: unknown): value is PromptParseRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "prompt" in value &&
    typeof value.prompt === "string" &&
    value.prompt.trim().length > 0
  );
}

function isPromptParseRunSpecUpdateRequest(
  value: unknown,
): value is PromptParseRunSpecUpdateRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "spec" in value &&
    isDeploymentSpec(value.spec)
  );
}

function promptParseRunIdFromUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  const match = /^\/api\/prompt-runs\/([^/]+)$/.exec(url);
  const runId = match?.[1];
  return runId ? decodeURIComponent(runId) : null;
}

async function requestSpecGeneration(
  payload: PromptParseRequest,
  serviceUrl = generatorBaseUrl(),
): Promise<PromptParseResponse> {
  const baseUrl = new URL(serviceUrl);

  return await new Promise<PromptParseResponse>((resolve, reject) => {
    const upstream = httpRequest(
      {
        protocol: baseUrl.protocol,
        hostname: baseUrl.hostname,
        port: baseUrl.port,
        path: "/internal/spec/generate",
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      },
      (upstreamResponse) => {
        const chunks: Buffer[] = [];

        upstreamResponse.on("data", (chunk) => {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        });

        upstreamResponse.on("end", () => {
          try {
            const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as
              | PromptParseResponse
              | { error: string };

            if ((upstreamResponse.statusCode ?? 500) >= 400) {
              const message = "error" in parsed ? parsed.error : "Generator request failed.";
              reject(new Error(message));
              return;
            }

            resolve(parsed as PromptParseResponse);
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    upstream.on("error", reject);
    upstream.write(JSON.stringify(payload));
    upstream.end();
  });
}

type SpecGenerationRequester = (payload: PromptParseRequest) => Promise<PromptParseResponse>;

export function createApiGatewayHandler(options?: {
  generatorServiceUrl?: string;
  requestSpecGeneration?: SpecGenerationRequester;
}) {
  return async (request: IncomingMessage, response: NodeJS.WritableStream & {
    writeHead(statusCode: number, headers: Record<string, string>): void;
    end(body?: string): void;
  }) => {
    try {
      if (request.method === "OPTIONS") {
        response.writeHead(204, {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
          "access-control-allow-headers": "content-type",
        });
        response.end();
        return;
      }

      if (request.method === "GET" && request.url === "/health") {
        const payload: HealthResponse = {
          service: apiGatewayManifest.name,
          status: "ok",
        };
        const result = json(200, payload);
        response.writeHead(result.statusCode, result.headers);
        response.end(result.body);
        return;
      }

      if (request.method === "GET" && request.url === "/api/prompt-runs") {
        const payload: PromptParseRunListResponse = {
          runs: await listPromptParseRuns(),
        };
        const result = json(200, payload);
        response.writeHead(result.statusCode, result.headers);
        response.end(result.body);
        return;
      }

      const runId = promptParseRunIdFromUrl(request.url);

      if (request.method === "GET" && runId) {
        const run = await readPromptParseRun(runId);

        if (!run) {
          const result = json(404, {
            error: "Prompt parse run not found.",
          });
          response.writeHead(result.statusCode, result.headers);
          response.end(result.body);
          return;
        }

        const payload: PromptParseRunEnvelope = {
          run,
        };
        const result = json(200, payload);
        response.writeHead(result.statusCode, result.headers);
        response.end(result.body);
        return;
      }

      if (request.method === "PATCH" && runId) {
        const payload = await readJsonBody(request);

        if (!isPromptParseRunSpecUpdateRequest(payload)) {
          const result = json(400, {
            error: "Invalid request body. Expected a valid deployment spec.",
          });
          response.writeHead(result.statusCode, result.headers);
          response.end(result.body);
          return;
        }

        const updatedRun = await updatePromptParseRunSpec(runId, payload.spec);

        if (!updatedRun) {
          const result = json(404, {
            error: "Prompt parse run not found.",
          });
          response.writeHead(result.statusCode, result.headers);
          response.end(result.body);
          return;
        }

        const envelope: PromptParseRunEnvelope = {
          run: updatedRun,
        };
        const result = json(200, envelope);
        response.writeHead(result.statusCode, result.headers);
        response.end(result.body);
        return;
      }

      if (request.method === "DELETE" && runId) {
        const deleted = await deletePromptParseRun(runId);

        if (!deleted) {
          const result = json(404, {
            error: "Prompt parse run not found.",
          });
          response.writeHead(result.statusCode, result.headers);
          response.end(result.body);
          return;
        }

        const result = json(200, {
          deleted: true,
          id: runId,
        });
        response.writeHead(result.statusCode, result.headers);
        response.end(result.body);
        return;
      }

      if (request.method === "POST" && request.url === "/api/prompts/parse") {
        const payload = await readJsonBody(request);

        if (!isPromptParseRequest(payload)) {
          const result = json(400, {
            error: "Invalid request body. Expected a non-empty prompt string.",
          });
          response.writeHead(result.statusCode, result.headers);
          response.end(result.body);
          return;
        }

        const generated = await (options?.requestSpecGeneration ??
          ((requestPayload) => requestSpecGeneration(requestPayload, options?.generatorServiceUrl)))({
          prompt: payload.prompt.trim(),
        });
        const run = toPromptParseRunRecord(randomUUID(), generated);
        await savePromptParseRun(run);

        const envelope: PromptParseRunEnvelope = {
          run,
        };
        const result = json(200, envelope);
        response.writeHead(result.statusCode, result.headers);
        response.end(result.body);
        return;
      }

      const result = json(404, {
        error: "Route not found.",
      });
      response.writeHead(result.statusCode, result.headers);
      response.end(result.body);
    } catch (error) {
      const result = json(502, {
        error: error instanceof Error ? error.message : "Unexpected upstream failure.",
      });
      response.writeHead(result.statusCode, result.headers);
      response.end(result.body);
    }
  };
}

export function createApiGatewayServer(options?: {
  generatorServiceUrl?: string;
  requestSpecGeneration?: SpecGenerationRequester;
}) {
  return createServer(createApiGatewayHandler(options));
}

function isDirectExecution(): boolean {
  return Boolean(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]);
}

if (isDirectExecution()) {
  const port = readPort();
  const server = createApiGatewayServer();

  server.listen(port, () => {
    console.log(`[api-gateway] listening on port ${port}`);
  });
}
