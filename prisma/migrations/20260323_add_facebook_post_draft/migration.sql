ALTER TYPE "WorkflowEventType" ADD VALUE IF NOT EXISTS 'FACEBOOK';

CREATE TABLE "FacebookPostDraft" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "hashtags" TEXT[],
    "selectedImageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacebookPostDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacebookPostDraft_jobId_key" ON "FacebookPostDraft"("jobId");

ALTER TABLE "FacebookPostDraft" ADD CONSTRAINT "FacebookPostDraft_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KeywordJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
