export const SUPPORTED_APPLICATION_TYPES = ["node_api"] as const;
export const SUPPORTED_DATABASE_TYPES = ["postgresql"] as const;
export const SUPPORTED_DEPLOYMENT_TARGETS = ["aws_ecs_fargate"] as const;
export const SUPPORTED_CI_PROVIDERS = ["github_actions"] as const;
export const SUPPORTED_LOGGING_BACKENDS = ["structured_json_cloudwatch"] as const;
export const SUPPORTED_TRACING_MODES = ["opentelemetry"] as const;
export const SUPPORTED_TRACE_BACKENDS = ["none", "tempo"] as const;

export type ApplicationType = (typeof SUPPORTED_APPLICATION_TYPES)[number];
export type DatabaseType = (typeof SUPPORTED_DATABASE_TYPES)[number];
export type DeploymentTarget = (typeof SUPPORTED_DEPLOYMENT_TARGETS)[number];
export type CiProvider = (typeof SUPPORTED_CI_PROVIDERS)[number];
export type LoggingBackend = (typeof SUPPORTED_LOGGING_BACKENDS)[number];
export type TracingMode = (typeof SUPPORTED_TRACING_MODES)[number];
export type TraceBackend = (typeof SUPPORTED_TRACE_BACKENDS)[number];

export interface DeploymentSpec {
  application: {
    type: ApplicationType;
    runtime: "nodejs_20";
    port: number;
  };
  database: {
    type: DatabaseType;
    tier: "managed";
  };
  compute: {
    target: DeploymentTarget;
    desiredCount: number;
    autoscaling: boolean;
  };
  delivery: {
    provider: CiProvider;
    deployOnMerge: boolean;
  };
  observability: {
    metrics: boolean;
    dashboards: boolean;
    logging: LoggingBackend;
    tracing: TracingMode;
    traceBackend: TraceBackend;
  };
  costs: {
    estimateBeforeApply: boolean;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function hasLiteral<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}

export function isDeploymentSpec(value: unknown): value is DeploymentSpec {
  if (!isRecord(value)) {
    return false;
  }

  const { application, database, compute, delivery, observability, costs } = value;

  if (!isRecord(application) || !isRecord(database) || !isRecord(compute)) {
    return false;
  }

  if (!isRecord(delivery) || !isRecord(observability) || !isRecord(costs)) {
    return false;
  }

  return (
    hasLiteral(application.type, SUPPORTED_APPLICATION_TYPES) &&
    application.runtime === "nodejs_20" &&
    isPositiveInteger(application.port) &&
    hasLiteral(database.type, SUPPORTED_DATABASE_TYPES) &&
    database.tier === "managed" &&
    hasLiteral(compute.target, SUPPORTED_DEPLOYMENT_TARGETS) &&
    isPositiveInteger(compute.desiredCount) &&
    isBoolean(compute.autoscaling) &&
    hasLiteral(delivery.provider, SUPPORTED_CI_PROVIDERS) &&
    isBoolean(delivery.deployOnMerge) &&
    isBoolean(observability.metrics) &&
    isBoolean(observability.dashboards) &&
    hasLiteral(observability.logging, SUPPORTED_LOGGING_BACKENDS) &&
    hasLiteral(observability.tracing, SUPPORTED_TRACING_MODES) &&
    hasLiteral(observability.traceBackend, SUPPORTED_TRACE_BACKENDS) &&
    isBoolean(costs.estimateBeforeApply)
  );
}

export function assertDeploymentSpec(value: unknown): DeploymentSpec {
  if (!isDeploymentSpec(value)) {
    throw new Error("Invalid deployment spec.");
  }

  return value;
}
