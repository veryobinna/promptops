import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { fileURLToPath } from "node:url";

import type {
  DeploymentSpec,
  HealthResponse,
  PromptParseRequest,
  PromptParseResponse,
} from "@promptops/shared-types";

export const generatorManifest = {
  name: "generator",
  responsibility: "Normalizes prompts into deployment specs and generates delivery artifacts.",
} as const;

const DEFAULT_PORT = 4001;

function readPort(): number {
  const rawPort = process.env.PORT;

  if (!rawPort) {
    return DEFAULT_PORT;
  }

  const parsed = Number(rawPort);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
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

export function buildSpecFromPrompt(prompt: string): PromptParseResponse {
  const normalizedPrompt = prompt.toLowerCase();
  const assumptions: string[] = [
    "Defaulted application type to Node.js API.",
    "Defaulted deployment target to AWS ECS Fargate.",
    "Defaulted database tier to managed PostgreSQL.",
  ];
  const warnings: string[] = [];

  const metricsRequested =
    normalizedPrompt.includes("monitoring") ||
    normalizedPrompt.includes("metrics") ||
    normalizedPrompt.includes("prometheus");
  const dashboardsRequested =
    normalizedPrompt.includes("monitoring") ||
    normalizedPrompt.includes("dashboard") ||
    normalizedPrompt.includes("grafana");
  const costEstimationRequested =
    normalizedPrompt.includes("cost") || normalizedPrompt.includes("infracost");
  const autoscalingRequested =
    normalizedPrompt.includes("scale") ||
    normalizedPrompt.includes("scalable") ||
    normalizedPrompt.includes("autoscaling");
  const ciRequested =
    normalizedPrompt.includes("ci/cd") ||
    normalizedPrompt.includes("github actions") ||
    normalizedPrompt.includes("pipeline");
  const loggingRequested =
    normalizedPrompt.includes("logging") || normalizedPrompt.includes("logs");
  const tracingRequested =
    normalizedPrompt.includes("tracing") || normalizedPrompt.includes("opentelemetry");

  if (!normalizedPrompt.includes("postgres")) {
    warnings.push("Prompt did not explicitly mention PostgreSQL; using the default managed PostgreSQL profile.");
  }

  if (!loggingRequested) {
    assumptions.push("Enabled structured JSON logs to CloudWatch Logs by default.");
  }

  if (!tracingRequested) {
    assumptions.push("Enabled OpenTelemetry instrumentation by default for trace readiness.");
  }

  const spec: DeploymentSpec = {
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
      desiredCount: autoscalingRequested ? 2 : 1,
      autoscaling: autoscalingRequested,
    },
    delivery: {
      provider: "github_actions",
      deployOnMerge: ciRequested,
    },
    observability: {
      metrics: metricsRequested,
      dashboards: dashboardsRequested,
      logging: "structured_json_cloudwatch",
      tracing: "opentelemetry",
      traceBackend: "none",
    },
    costs: {
      estimateBeforeApply: costEstimationRequested,
    },
  };

  return {
    sourcePrompt: prompt,
    spec,
    assumptions,
    warnings,
  };
}

export function createGeneratorServer() {
  return createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        const payload: HealthResponse = {
          service: generatorManifest.name,
          status: "ok",
        };
        const result = json(200, payload);
        response.writeHead(result.statusCode, result.headers);
        response.end(result.body);
        return;
      }

      if (request.method === "POST" && request.url === "/internal/spec/generate") {
        const payload = await readJsonBody(request);

        if (!isPromptParseRequest(payload)) {
          const result = json(400, {
            error: "Invalid request body. Expected a non-empty prompt string.",
          });
          response.writeHead(result.statusCode, result.headers);
          response.end(result.body);
          return;
        }

        const result = json(200, buildSpecFromPrompt(payload.prompt.trim()));
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
      const result = json(500, {
        error: error instanceof Error ? error.message : "Unexpected generator failure.",
      });
      response.writeHead(result.statusCode, result.headers);
      response.end(result.body);
    }
  });
}

function isDirectExecution(): boolean {
  return Boolean(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]);
}

if (isDirectExecution()) {
  const port = readPort();
  const server = createGeneratorServer();

  server.listen(port, () => {
    console.log(`[generator] listening on port ${port}`);
  });
}
