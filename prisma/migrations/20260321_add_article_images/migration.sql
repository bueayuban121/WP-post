CREATE TABLE "ArticleImage" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "sectionHeading" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleImage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ArticleImage"
ADD CONSTRAINT "ArticleImage_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "KeywordJob"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE INDEX "ArticleImage_jobId_sortOrder_idx" ON "ArticleImage"("jobId", "sortOrder");
