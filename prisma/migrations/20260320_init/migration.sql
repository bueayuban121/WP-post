-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkflowStage" AS ENUM ('IDEA_POOL', 'SELECTED', 'RESEARCHING', 'BRIEF_READY', 'DRAFTING', 'REVIEW', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ResearchRegion" AS ENUM ('TH', 'GLOBAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordJob" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "seedKeyword" TEXT NOT NULL,
    "stage" "WorkflowStage" NOT NULL DEFAULT 'IDEA_POOL',
    "selectedIdeaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicIdea" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "searchIntent" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "thaiSignal" TEXT NOT NULL,
    "globalSignal" TEXT NOT NULL,
    "relatedKeywords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchPack" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "gaps" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSource" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "region" "ResearchRegion" NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "insight" TEXT NOT NULL,

    CONSTRAINT "ResearchSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBrief" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "metaTitle" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "outline" TEXT[],
    "faqs" TEXT[],
    "internalLinks" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleDraft" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "conclusion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftSection" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "DraftSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchPack_jobId_key" ON "ResearchPack"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBrief_jobId_key" ON "ContentBrief"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleDraft_jobId_key" ON "ArticleDraft"("jobId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordJob" ADD CONSTRAINT "KeywordJob_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordJob" ADD CONSTRAINT "KeywordJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicIdea" ADD CONSTRAINT "TopicIdea_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KeywordJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchPack" ADD CONSTRAINT "ResearchPack_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KeywordJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSource" ADD CONSTRAINT "ResearchSource_packId_fkey" FOREIGN KEY ("packId") REFERENCES "ResearchPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KeywordJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleDraft" ADD CONSTRAINT "ArticleDraft_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KeywordJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftSection" ADD CONSTRAINT "DraftSection_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ArticleDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

