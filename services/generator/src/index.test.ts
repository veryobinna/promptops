import assert from "node:assert/strict";
import test from "node:test";

import { buildArtifactsFromSpec, buildSpecFromPrompt } from "./index.js";

test("buildSpecFromPrompt enables requested capabilities from the prompt", () => {
  const result = buildSpecFromPrompt(
    "Deploy a scalable Node.js API with PostgreSQL, CI/CD, monitoring, logging, tracing, and cost estimation",
  );

  assert.equal(result.sourcePrompt.includes("scalable"), true);
  assert.equal(result.spec.compute.autoscaling, true);
  assert.equal(result.spec.compute.desiredCount, 2);
  assert.equal(result.spec.delivery.deployOnMerge, true);
  assert.equal(result.spec.observability.metrics, true);
  assert.equal(result.spec.observability.dashboards, true);
  assert.equal(result.spec.observability.logging, "structured_json_cloudwatch");
  assert.equal(result.spec.observability.tracing, "opentelemetry");
  assert.equal(result.spec.costs.estimateBeforeApply, true);
  assert.deepEqual(result.warnings, []);
});

test("buildSpecFromPrompt applies defaults when the prompt is underspecified", () => {
  const result = buildSpecFromPrompt("Deploy a Node.js API");

  assert.equal(result.spec.compute.autoscaling, false);
  assert.equal(result.spec.compute.desiredCount, 1);
  assert.equal(result.spec.delivery.deployOnMerge, false);
  assert.equal(result.spec.observability.metrics, false);
  assert.equal(result.spec.observability.dashboards, false);
  assert.equal(result.spec.observability.logging, "structured_json_cloudwatch");
  assert.equal(result.spec.observability.traceBackend, "none");
  assert.equal(result.spec.costs.estimateBeforeApply, false);
  assert.equal(result.assumptions.includes("Enabled structured JSON logs to CloudWatch Logs by default."), true);
  assert.equal(
    result.assumptions.includes("Enabled OpenTelemetry instrumentation by default for trace readiness."),
    true,
  );
  assert.equal(
    result.warnings.includes(
      "Prompt did not explicitly mention PostgreSQL; using the default managed PostgreSQL profile.",
    ),
    true,
  );
});

test("buildArtifactsFromSpec produces deterministic terraform and workflow files", () => {
  const spec = buildSpecFromPrompt(
    "Deploy a scalable Node.js API with PostgreSQL, CI/CD, monitoring, logging, and cost estimation",
  ).spec;

  const artifacts = buildArtifactsFromSpec("run-123", spec, "2026-01-01T00:00:00.000Z");

  assert.equal(artifacts.runId, "run-123");
  assert.equal(artifacts.files.length, 4);
  assert.deepEqual(
    artifacts.files.map((file) => file.path),
    [
      "terraform/main.tf",
      "terraform/variables.tf",
      "terraform/outputs.tf",
      ".github/workflows/deploy.yml",
    ],
  );
  assert.equal(
    artifacts.files.some((file) => file.content.includes('desired_count        = 2')),
    true,
  );
  assert.equal(
    artifacts.files.some((file) => file.content.includes("hashicorp/setup-terraform@v3")),
    true,
  );
});
