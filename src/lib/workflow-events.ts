import {
  WorkflowEventStatus,
  WorkflowEventType,
  type Prisma
} from "@/generated/prisma/client";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/prisma";
import type {
  WorkflowAutomationEvent,
  WorkflowAutomationStatus,
  WorkflowAutomationType
} from "@/types/workflow";

const memoryEvents = new Map<string, WorkflowAutomationEvent[]>();

function mapTypeToDb(type: WorkflowAutomationType): WorkflowEventType {
  return type.toUpperCase() as WorkflowEventType;
}

function mapTypeFromDb(type: WorkflowEventType): WorkflowAutomationType {
  return type.toLowerCase() as WorkflowAutomationType;
}

function mapStatusToDb(status: WorkflowAutomationStatus): WorkflowEventStatus {
  return status.toUpperCase() as WorkflowEventStatus;
}

function mapStatusFromDb(status: WorkflowEventStatus): WorkflowAutomationStatus {
  return status.toLowerCase() as WorkflowAutomationStatus;
}

function cloneEvent(event: WorkflowAutomationEvent): WorkflowAutomationEvent {
  return JSON.parse(JSON.stringify(event)) as WorkflowAutomationEvent;
}

type StoredEvent = Prisma.WorkflowEventGetPayload<Record<string, never>>;

function fromStoredEvent(event: StoredEvent): WorkflowAutomationEvent {
  return {
    id: event.id,
    jobId: event.jobId,
    type: mapTypeFromDb(event.type),
    status: mapStatusFromDb(event.status),
    source: event.source === "n8n" ? "n8n" : "app",
    workflowRunId: event.workflowRunId ?? undefined,
    message: event.message ?? undefined,
    payload:
      event.payload && typeof event.payload === "object"
        ? (event.payload as Record<string, unknown>)
        : undefined,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString()
  };
}

export async function listWorkflowEvents(jobId: string) {
  if (!isDatabaseConfigured()) {
    return (memoryEvents.get(jobId) ?? []).map(cloneEvent);
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return [];
  }

  const events = await prisma.workflowEvent.findMany({
    where: { jobId },
    orderBy: {
      createdAt: "desc"
    }
  });

  return events.map(fromStoredEvent);
}

export async function createWorkflowEvent(input: {
  jobId: string;
  type: WorkflowAutomationType;
  status: WorkflowAutomationStatus;
  source: "app" | "n8n";
  workflowRunId?: string;
  message?: string;
  payload?: Record<string, unknown>;
}) {
  if (!isDatabaseConfigured()) {
    const event: WorkflowAutomationEvent = {
      id: crypto.randomUUID(),
      jobId: input.jobId,
      type: input.type,
      status: input.status,
      source: input.source,
      workflowRunId: input.workflowRunId,
      message: input.message,
      payload: input.payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const current = memoryEvents.get(input.jobId) ?? [];
    memoryEvents.set(input.jobId, [event, ...current]);
    return cloneEvent(event);
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }

  const event = await prisma.workflowEvent.create({
    data: {
      jobId: input.jobId,
      type: mapTypeToDb(input.type),
      status: mapStatusToDb(input.status),
      source: input.source,
      workflowRunId: input.workflowRunId,
      message: input.message,
      payload: input.payload
    }
  });

  return fromStoredEvent(event);
}

export async function updateWorkflowEvent(
  eventId: string,
  input: {
    status?: WorkflowAutomationStatus;
    workflowRunId?: string;
    message?: string;
    payload?: Record<string, unknown>;
  }
) {
  if (!isDatabaseConfigured()) {
    for (const [jobId, events] of memoryEvents.entries()) {
      const index = events.findIndex((event) => event.id === eventId);
      if (index === -1) continue;

      const updated: WorkflowAutomationEvent = {
        ...events[index],
        ...(input.status ? { status: input.status } : {}),
        ...(input.workflowRunId ? { workflowRunId: input.workflowRunId } : {}),
        ...(input.message ? { message: input.message } : {}),
        ...(input.payload ? { payload: input.payload } : {}),
        updatedAt: new Date().toISOString()
      };
      const nextEvents = [...events];
      nextEvents[index] = updated;
      memoryEvents.set(jobId, nextEvents);
      return cloneEvent(updated);
    }

    return null;
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  const event = await prisma.workflowEvent.update({
    where: { id: eventId },
    data: {
      ...(input.status ? { status: mapStatusToDb(input.status) } : {}),
      ...(input.workflowRunId ? { workflowRunId: input.workflowRunId } : {}),
      ...(input.message ? { message: input.message } : {}),
      ...(input.payload ? { payload: input.payload } : {})
    }
  });

  return fromStoredEvent(event);
}
