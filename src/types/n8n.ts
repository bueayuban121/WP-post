import type {
  ArticleDraft,
  ContentBrief,
  ResearchPack,
  WorkflowAutomationStatus,
  WorkflowAutomationType,
  WorkflowJob,
  WorkflowStage
} from "@/types/workflow";

export type N8nTriggerPayload = {
  jobId: string;
  client: string;
  seedKeyword: string;
  stage: WorkflowStage;
  selectedIdeaId: string;
  type: WorkflowAutomationType;
  callbackUrl?: string;
  callbackSecret?: string;
  eventId: string;
  requestedAt: string;
  job: WorkflowJob;
};

export type N8nCallbackPayload = {
  eventId?: string;
  jobId: string;
  type: WorkflowAutomationType;
  status: WorkflowAutomationStatus;
  workflowRunId?: string;
  message?: string;
  stage?: WorkflowStage;
  payload?: Record<string, unknown>;
  research?: ResearchPack;
  brief?: ContentBrief;
  draft?: ArticleDraft;
};
