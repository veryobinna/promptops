import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type { IncomingMessage } from "node:http";

import type { PromptParseResponse } from "@promptops/shared-types";
import { createApiGatewayHandler } from "./index.js";

type MockResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

function createRequest(method: string, url: string, body?: unknown): IncomingMessage {
  const rawBody = body === undefined ? "" : JSON.stringify(body);
  const request = Readable.from(rawBody ? [rawBody] : []) as IncomingMessage;
  request.method = method;
  request.url = url;
  return request;
}

async function invokeHandler(
  handler: ReturnType<typeof createApiGatewayHandler>,
  method: string,
  url: string,
  body?: unknown,
): Promise<MockResponse> {
  let statusCode = 200;
  let headers: Record<string, string> = {};
  let responseBody = "";

  const response = {
    writeHead(nextStatusCode: number, nextHeaders: Record<string, string>) {
      statusCode = nextStatusCode;
      headers = nextHeaders;
    },
    end(bodyText = "") {
      responseBody = bodyText;
    },
  };

  await handler(
    createRequest(method, url, body),
    response as unknown as NodeJS.WritableStream & {
      writeHead(statusCode: number, headers: Record<string, string>): void;
      end(body?: string): void;
    },
  );

  return {
    statusCode,
    headers,
    body: responseBody,
  };
}

test("api-gateway creates and updates a persisted prompt parse run", async () => {
  const previousDataDir = process.env.API_GATEWAY_DATA_DIR;
  const dataDir = await mkdtemp(join(tmpdir(), "promptops-api-gateway-test-"));
  process.env.API_GATEWAY_DATA_DIR = dataDir;

  const generatedPayload: PromptParseResponse = {
    sourcePrompt: "Deploy a scalable Node.js API with PostgreSQL, monitoring, and cost estimation",
    spec: {
      application: {
        type: "node_api",
        runtime: "nodejs_20",
        port: 3000,
      },
      database: {
        type: "postgresql",
        tier: "managed",
      },
      compute: {
        target: "aws_ecs_fargate",
        desiredCount: 2,
        autoscaling: true,
      },
      delivery: {
        provider: "github_actions",
        deployOnMerge: false,
      },
      observability: {
        metrics: true,
        dashboards: true,
        logging: "structured_json_cloudwatch",
        tracing: "opentelemetry",
        traceBackend: "none",
      },
      costs: {
        estimateBeforeApply: true,
      },
    },
    assumptions: [],
    warnings: [],
  };

  const handler = createApiGatewayHandler({
    requestSpecGeneration: async () => generatedPayload,
  });

  try {
    const createResponse = await invokeHandler(handler, "POST", "/api/prompts/parse", {
      prompt: generatedPayload.sourcePrompt,
    });

    assert.equal(createResponse.statusCode, 200);
    assert.equal(createResponse.headers["access-control-allow-origin"], "*");

    const createdPayload = JSON.parse(createResponse.body) as {
      run: {
        id: string;
        spec: {
          compute: {
            desiredCount: number;
          };
        };
      };
    };

    assert.equal(createdPayload.run.spec.compute.desiredCount, 2);

    const patchResponse = await invokeHandler(
      handler,
      "PATCH",
      `/api/prompt-runs/${encodeURIComponent(createdPayload.run.id)}`,
      {
        spec: {
          application: {
            type: "node_api",
            runtime: "nodejs_20",
            port: 3000,
          },
          database: {
            type: "postgresql",
            tier: "managed",
          },
          compute: {
            target: "aws_ecs_fargate",
            desiredCount: 3,
            autoscaling: true,
          },
          delivery: {
            provider: "github_actions",
            deployOnMerge: false,
          },
          observability: {
            metrics: true,
            dashboards: true,
            logging: "structured_json_cloudwatch",
            tracing: "opentelemetry",
            traceBackend: "none",
          },
          costs: {
            estimateBeforeApply: true,
          },
        },
      },
    );

    assert.equal(patchResponse.statusCode, 200);
    const updatedPayload = JSON.parse(patchResponse.body) as {
      run: {
        id: string;
        spec: {
          compute: {
            desiredCount: number;
          };
        };
      };
    };

    assert.equal(updatedPayload.run.spec.compute.desiredCount, 3);

    const fetchResponse = await invokeHandler(
      handler,
      "GET",
      `/api/prompt-runs/${encodeURIComponent(createdPayload.run.id)}`,
    );
    assert.equal(fetchResponse.statusCode, 200);

    const fetchedPayload = JSON.parse(fetchResponse.body) as {
      run: {
        id: string;
        spec: {
          compute: {
            desiredCount: number;
          };
        };
      };
    };

    assert.equal(fetchedPayload.run.id, createdPayload.run.id);
    assert.equal(fetchedPayload.run.spec.compute.desiredCount, 3);

    const deleteResponse = await invokeHandler(
      handler,
      "DELETE",
      `/api/prompt-runs/${encodeURIComponent(createdPayload.run.id)}`,
    );
    assert.equal(deleteResponse.statusCode, 200);

    const afterDeleteResponse = await invokeHandler(
      handler,
      "GET",
      `/api/prompt-runs/${encodeURIComponent(createdPayload.run.id)}`,
    );
    assert.equal(afterDeleteResponse.statusCode, 404);
  } finally {
    await rm(dataDir, {
      recursive: true,
      force: true,
    });

    if (previousDataDir === undefined) {
      delete process.env.API_GATEWAY_DATA_DIR;
    } else {
      process.env.API_GATEWAY_DATA_DIR = previousDataDir;
    }
  }
});
