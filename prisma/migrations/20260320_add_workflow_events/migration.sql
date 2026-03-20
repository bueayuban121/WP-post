-- CreateEnum
CREATE TYPE "WorkflowEventType" AS ENUM ('RESEARCH', 'BRIEF', 'DRAFT', 'PUBLISH');

-- CreateEnum
CREATE TYPE "WorkflowEventStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "WorkflowEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" "WorkflowEventType" NOT NULL,
    "status" "WorkflowEventStatus" NOT NULL DEFAULT 'QUEUED',
    "source" TEXT NOT NULL,
    "workflowRunId" TEXT,
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkflowEvent"
ADD CONSTRAINT "WorkflowEvent_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "KeywordJob"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
