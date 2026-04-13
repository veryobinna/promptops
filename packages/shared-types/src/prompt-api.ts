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

export type PromptParseRunStatus = "completed";

export interface PromptParseRunRecord extends PromptParseResponse {
  id: string;
  status: PromptParseRunStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PromptParseRunEnvelope {
  run: PromptParseRunRecord;
}

export interface PromptParseRunListResponse {
  runs: PromptParseRunRecord[];
}

export interface HealthResponse {
  service: string;
  status: "ok";
}
