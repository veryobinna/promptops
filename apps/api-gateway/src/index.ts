import { createServer, request as httpRequest } from "node:http";
import type { IncomingMessage } from "node:http";

import type {
  HealthResponse,
  PromptParseRequest,
  PromptParseResponse,
} from "@promptops/shared-types";

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

async function requestSpecGeneration(payload: PromptParseRequest): Promise<PromptParseResponse> {
  const baseUrl = new URL(generatorBaseUrl());

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

const server = createServer(async (request, response) => {
  try {
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

      const generated = await requestSpecGeneration({
        prompt: payload.prompt.trim(),
      });
      const result = json(200, generated);
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
});

const port = readPort();

server.listen(port, () => {
  console.log(`[api-gateway] listening on port ${port}`);
});
