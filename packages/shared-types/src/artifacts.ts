export const GENERATED_ARTIFACT_TYPES = [
  "deployment_spec",
  "terraform_bundle",
  "github_actions_workflow",
  "cost_estimate_report",
  "deployment_run_log",
] as const;

export type GeneratedArtifactType = (typeof GENERATED_ARTIFACT_TYPES)[number];

export interface GeneratedArtifact {
  id: string;
  projectId: string;
  runId: string;
  artifactType: GeneratedArtifactType;
  storagePath: string;
  checksum: string;
}
