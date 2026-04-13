import type { DeploymentSpec } from "./deployment-spec.js";

export const GENERATED_ARTIFACT_FILE_TYPES = ["terraform", "github_actions"] as const;

export type GeneratedArtifactFileType = (typeof GENERATED_ARTIFACT_FILE_TYPES)[number];

export interface GeneratedArtifactFile {
  path: string;
  type: GeneratedArtifactFileType;
  content: string;
}

export interface GeneratedArtifactBundle {
  runId: string;
  createdAt: string;
  files: GeneratedArtifactFile[];
}

export interface ArtifactGenerationRequest {
  runId: string;
  spec: DeploymentSpec;
}

export interface ArtifactGenerationResponse {
  artifacts: GeneratedArtifactBundle;
}

export interface PromptRunArtifactEnvelope {
  artifacts: GeneratedArtifactBundle;
}
