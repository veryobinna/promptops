export const DEPLOYMENT_RUN_STATUSES = [
  "draft",
  "spec_ready",
  "generation_in_progress",
  "generation_complete",
  "awaiting_approval",
  "plan_in_progress",
  "plan_complete",
  "deploy_in_progress",
  "deploy_succeeded",
  "deploy_failed",
] as const;

export const DEPLOYMENT_RUN_STEPS = [
  "prompt_received",
  "spec_generated",
  "spec_reviewed",
  "artifacts_generated",
  "cost_estimated",
  "approved",
  "terraform_plan",
  "terraform_apply",
  "service_deployed",
] as const;

export type DeploymentRunStatus = (typeof DEPLOYMENT_RUN_STATUSES)[number];
export type DeploymentRunStep = (typeof DEPLOYMENT_RUN_STEPS)[number];

export interface DeploymentRun {
  id: string;
  projectId: string;
  specId: string;
  status: DeploymentRunStatus;
  currentStep: DeploymentRunStep;
  logsUrl: string | null;
  costEstimate: number | null;
  startedAt: string;
  completedAt: string | null;
}
