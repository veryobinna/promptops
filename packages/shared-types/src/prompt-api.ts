import type { DeploymentSpec } from "./deployment-spec.js";

export interface PromptParseRequest {
  prompt: string;
}

export interface PromptParseResponse {
  sourcePrompt: string;
  spec: DeploymentSpec;
  assumptions: string[];
  warnings: string[];
}

export interface HealthResponse {
  service: string;
  status: "ok";
}
