import { mockWorkflowJob } from "@/data/mock-workflow";
import { generateArticleImages, inferArticleImageTextMode } from "@/lib/article-images";
import { resolveClientPlanByClientId, resolveClientPlanByClientName, type ClientPlan } from "@/lib/client-plan";
import { buildResearchPackFromDataForSeo, getDataForSeoSerpSnapshot } from "@/lib/dataforseo";
import { normalizeGenerationSettings } from "@/lib/generation-settings";
import { generateBriefWithOpenAi, generateDraftWithOpenAi, polishDraftWithOpenAi } from "@/lib/openai";
import { generateManagedImage, isManagedImageGenerationConfigured } from "@/lib/image-provider";
import { getPromptConfig } from "@/lib/prompt-config";
import { resolveResearchProviderByClientId, resolveResearchProviderByClientName } from "@/lib/research-provider-config";
import { buildNewJob, generateBrief, generateDraft, generateResearch, generateTopicIdeas } from "@/lib/workflow-generators";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/prisma";
import { createWorkflowEvent, listWorkflowEvents } from "@/lib/workflow-events";
import type {
  WorkflowJob,
  WorkflowStage as AppWorkflowStage,
  TopicIdea,
  ResearchPack,
  ContentBrief,
  ArticleDraft,
  WorkflowAutomationEvent,
  ArticleImageAsset,
  FacebookPostDraft,
  WorkflowGenerationSettings,
  SerpSnapshot
} from "@/types/workflow";
import { WorkflowStage, ResearchRegion, type Prisma } from "@/generated/prisma/client";

const jobs = new Map<string, WorkflowJob>([[mockWorkflowJob.id, mockWorkflowJob]]);

function getImageQualityModeForPlan(plan: ClientPlan, prompt: string) {
  if (plan === "normal") {
    return "fast" as const;
  }

  return inferArticleImageTextMode(prompt) === "text_overlay" ? ("premium-text" as const) : ("fast" as const);
}

async function resolveJobClientPlan(job: Pick<WorkflowJob, "client">) {
  return resolveClientPlanByClientName(job.client);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const jobInclude = {
  client: true,
  ideas: true,
  researchPack: {
    include: {
      sources: true
    }
  },
  contentBrief: true,
  facebookPost: true,
  articleDraft: {
    include: {
      sections: {
        orderBy: {
          sortOrder: "asc"
        }
      }
    }
  },
  articleImages: {
    orderBy: {
      sortOrder: "asc"
    }
  },
  workflowEvents: {
    orderBy: {
      createdAt: "desc"
    }
  }
} satisfies Prisma.KeywordJobInclude;

type StoredJob = Prisma.KeywordJobGetPayload<{ include: typeof jobInclude }>;
type JobAccessScope = {
  clientId?: string;
};

function cloneJob(job: WorkflowJob): WorkflowJob {
  return JSON.parse(JSON.stringify(job)) as WorkflowJob;
}

function createEmptyResearch(): ResearchPack {
  return {
    objective: "",
    audience: "",
    gaps: [],
    sources: []
  };
}

function createEmptyBrief(): ContentBrief {
  return {
    title: "",
    slug: "",
    metaTitle: "",
    metaDescription: "",
    audience: "",
    angle: "",
    publishStatus: "draft",
    categoryIds: [],
    tagIds: [],
    featuredImageUrl: "",
    outline: [],
    faqs: [],
    internalLinks: []
  };
}

function createEmptyDraft(): ArticleDraft {
  return {
    intro: "",
    sections: [],
    conclusion: ""
  };
}

function createEmptyFacebook(): FacebookPostDraft {
  return {
    caption: "",
    hashtags: [],
    selectedImageId: "",
    status: "draft"
  };
}

function isKeywordVariantPhase(job: WorkflowJob) {
  return job.researchProvider === "dataforseo" && job.stage === "idea_pool";
}

function extractSerpSnapshot(events?: WorkflowAutomationEvent[]): SerpSnapshot | null {
  const snapshotEvent = events?.find((event) => event.payload && typeof event.payload.serpSnapshot === "object");
  const snapshotPayload = snapshotEvent?.payload?.serpSnapshot;

  if (!snapshotPayload || typeof snapshotPayload !== "object") {
    return null;
  }

  return snapshotPayload as SerpSnapshot;
}

function mapStoredAutomationEvent(event: StoredJob["workflowEvents"][number]): WorkflowAutomationEvent {
  return {
    id: event.id,
    jobId: event.jobId,
    type: event.type.toLowerCase() as WorkflowAutomationEvent["type"],
    status: event.status.toLowerCase() as WorkflowAutomationEvent["status"],
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

function sanitizePlannedImageSrc(src: string) {
  const value = src.trim();

  if (!value) {
    return "";
  }

  if (
    value.includes("image.pollinations.ai/prompt") ||
    value.includes("/article-images/goldfish-water-1.svg")
  ) {
    return "";
  }

  return value;
}

async function withResolvedProvider(job: WorkflowJob): Promise<WorkflowJob> {
  const provider = await resolveResearchProviderByClientName(job.client);
  return {
    ...job,
    researchProvider: provider
  };
}

function toAppStage(stage: WorkflowStage): AppWorkflowStage {
  return stage.toLowerCase() as AppWorkflowStage;
}

function toDbStage(stage: AppWorkflowStage): WorkflowStage {
  return stage.toUpperCase() as WorkflowStage;
}

function toStoredJob(job: WorkflowJob) {
  return {
    id: job.id,
    seedKeyword: job.seedKeyword,
    stage: toDbStage(job.stage),
    selectedIdeaId: job.selectedIdeaId,
    ideas: {
      create: job.ideas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        angle: idea.angle,
        searchIntent: idea.searchIntent,
        difficulty: idea.difficulty,
        confidence: idea.confidence,
        whyItMatters: idea.whyItMatters,
        thaiSignal: idea.thaiSignal,
        globalSignal: idea.globalSignal,
        relatedKeywords: idea.relatedKeywords
      }))
    },
    researchPack: {
      create: {
        objective: job.research.objective,
        audience: job.research.audience,
        gaps: job.research.gaps,
        sources: {
          create: job.research.sources.map((source) => ({
            region: source.region === "TH" ? ResearchRegion.TH : ResearchRegion.GLOBAL,
            title: source.title,
            source: source.source,
            insight: source.insight
          }))
        }
      }
    },
    contentBrief: {
      create: {
        title: job.brief.title,
        slug: job.brief.slug,
        metaTitle: job.brief.metaTitle,
        metaDescription: job.brief.metaDescription,
        audience: job.brief.audience,
        angle: job.brief.angle,
        publishStatus: job.brief.publishStatus,
        categoryIds: job.brief.categoryIds,
        tagIds: job.brief.tagIds,
        featuredImageUrl: job.brief.featuredImageUrl,
        outline: job.brief.outline,
        faqs: job.brief.faqs,
        internalLinks: job.brief.internalLinks
      }
    },
    articleDraft: {
      create: {
        intro: job.draft.intro,
        conclusion: job.draft.conclusion,
        sections: {
          create: job.draft.sections.map((section, index) => ({
            heading: section.heading,
            body: section.body,
            sortOrder: index
          }))
        }
      }
    },
    articleImages: {
      create: job.images.map((image, index) => ({
        id: image.id,
        kind: image.kind,
        src: image.src,
        alt: image.alt,
        caption: image.caption,
        placement: image.placement,
        prompt: image.prompt,
        sectionHeading: image.sectionHeading,
        sortOrder: index
      }))
    },
    facebookPost: {
      create: {
        caption: job.facebook.caption,
        hashtags: job.facebook.hashtags,
        selectedImageId: job.facebook.selectedImageId || null,
        status: job.facebook.status
      }
    }
  };
}

function fromStoredJob(job: StoredJob): WorkflowJob {
  const automationEvents = job.workflowEvents.map(mapStoredAutomationEvent);

  return {
    id: job.id,
    client: job.client?.name ?? "Unknown client",
    seedKeyword: job.seedKeyword,
    researchProvider: "tavily",
    stage: toAppStage(job.stage),
    selectedIdeaId: job.selectedIdeaId ?? "",
    ideas: job.ideas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      angle: idea.angle,
      searchIntent: idea.searchIntent as TopicIdea["searchIntent"],
      difficulty: idea.difficulty as TopicIdea["difficulty"],
      confidence: idea.confidence,
      whyItMatters: idea.whyItMatters,
      thaiSignal: idea.thaiSignal,
      globalSignal: idea.globalSignal,
      relatedKeywords: idea.relatedKeywords
    })),
    serpSnapshot: extractSerpSnapshot(automationEvents),
    research: {
      objective: job.researchPack?.objective ?? "",
      audience: job.researchPack?.audience ?? "",
      gaps: job.researchPack?.gaps ?? [],
      sources:
        job.researchPack?.sources.map((source) => ({
          region: source.region === ResearchRegion.TH ? "TH" : "Global",
          title: source.title,
          source: source.source,
          insight: source.insight
        })) ?? []
    },
    brief: {
      title: job.contentBrief?.title ?? "",
      slug: job.contentBrief?.slug ?? "",
      metaTitle: job.contentBrief?.metaTitle ?? "",
      metaDescription: job.contentBrief?.metaDescription ?? "",
      audience: job.contentBrief?.audience ?? "",
      angle: job.contentBrief?.angle ?? "",
      publishStatus: (job.contentBrief?.publishStatus as "draft" | "publish" | undefined) ?? "draft",
      categoryIds: job.contentBrief?.categoryIds ?? [],
      tagIds: job.contentBrief?.tagIds ?? [],
      featuredImageUrl: job.contentBrief?.featuredImageUrl ?? "",
      outline: job.contentBrief?.outline ?? [],
      faqs: job.contentBrief?.faqs ?? [],
      internalLinks: job.contentBrief?.internalLinks ?? []
    },
    draft: {
      intro: job.articleDraft?.intro ?? "",
      sections:
        job.articleDraft?.sections.map((section) => ({
          heading: section.heading,
          body: section.body
        })) ?? [],
      conclusion: job.articleDraft?.conclusion ?? ""
    },
    images: job.articleImages.map((image) => ({
      id: image.id,
      kind: image.kind as ArticleImageAsset["kind"],
      src: sanitizePlannedImageSrc(image.src),
      alt: image.alt,
      caption: image.caption,
      placement: image.placement,
      prompt: image.prompt,
      sectionHeading: image.sectionHeading ?? undefined
    })),
    facebook: {
      caption: job.facebookPost?.caption ?? "",
      hashtags: job.facebookPost?.hashtags ?? [],
      selectedImageId: job.facebookPost?.selectedImageId ?? job.articleImages[0]?.id ?? "",
      status: (job.facebookPost?.status as FacebookPostDraft["status"] | undefined) ?? "draft"
    },
    automationEvents
  };
}

async function updateStoredWorkflow(
  jobId: string,
  stage: AppWorkflowStage,
  payload: {
    seedKeyword?: string;
    selectedIdeaId?: string;
    ideas?: TopicIdea[];
    research?: ResearchPack;
    brief?: ContentBrief;
    draft?: ArticleDraft;
    images?: ArticleImageAsset[];
    facebook?: FacebookPostDraft;
  }
) {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  const job = await prisma.keywordJob.update({
    where: { id: jobId },
    data: {
      ...(payload.seedKeyword !== undefined ? { seedKeyword: payload.seedKeyword } : {}),
      stage: toDbStage(stage),
      ...(payload.selectedIdeaId !== undefined ? { selectedIdeaId: payload.selectedIdeaId || null } : {}),
      ...(payload.ideas
        ? {
            ideas: {
              deleteMany: {},
              create: payload.ideas.map((idea) => ({
                id: idea.id,
                title: idea.title,
                angle: idea.angle,
                searchIntent: idea.searchIntent,
                difficulty: idea.difficulty,
                confidence: idea.confidence,
                whyItMatters: idea.whyItMatters,
                thaiSignal: idea.thaiSignal,
                globalSignal: idea.globalSignal,
                relatedKeywords: idea.relatedKeywords
              }))
            }
          }
        : {}),
      ...(payload.research
        ? {
            researchPack: {
              upsert: {
                create: {
                  objective: payload.research.objective,
                  audience: payload.research.audience,
                  gaps: payload.research.gaps,
                  sources: {
                    create: payload.research.sources.map((source) => ({
                      region: source.region === "TH" ? ResearchRegion.TH : ResearchRegion.GLOBAL,
                      title: source.title,
                      source: source.source,
                      insight: source.insight
                    }))
                  }
                },
                update: {
                  objective: payload.research.objective,
                  audience: payload.research.audience,
                  gaps: payload.research.gaps,
                  sources: {
                    deleteMany: {},
                    create: payload.research.sources.map((source) => ({
                      region: source.region === "TH" ? ResearchRegion.TH : ResearchRegion.GLOBAL,
                      title: source.title,
                      source: source.source,
                      insight: source.insight
                    }))
                  }
                }
              }
            }
          }
        : {}),
      ...(payload.brief
        ? {
            contentBrief: {
              upsert: {
                create: {
                  title: payload.brief.title,
                  slug: payload.brief.slug,
                  metaTitle: payload.brief.metaTitle,
                  metaDescription: payload.brief.metaDescription,
                  audience: payload.brief.audience,
                  angle: payload.brief.angle,
                  publishStatus: payload.brief.publishStatus,
                  categoryIds: payload.brief.categoryIds,
                  tagIds: payload.brief.tagIds,
                  featuredImageUrl: payload.brief.featuredImageUrl,
                  outline: payload.brief.outline,
                  faqs: payload.brief.faqs,
                  internalLinks: payload.brief.internalLinks
                },
                update: {
                  title: payload.brief.title,
                  slug: payload.brief.slug,
                  metaTitle: payload.brief.metaTitle,
                  metaDescription: payload.brief.metaDescription,
                  audience: payload.brief.audience,
                  angle: payload.brief.angle,
                  publishStatus: payload.brief.publishStatus,
                  categoryIds: payload.brief.categoryIds,
                  tagIds: payload.brief.tagIds,
                  featuredImageUrl: payload.brief.featuredImageUrl,
                  outline: payload.brief.outline,
                  faqs: payload.brief.faqs,
                  internalLinks: payload.brief.internalLinks
                }
              }
            }
          }
        : {}),
      ...(payload.draft
        ? {
            articleDraft: {
              upsert: {
                create: {
                  intro: payload.draft.intro,
                  conclusion: payload.draft.conclusion,
                  sections: {
                    create: payload.draft.sections.map((section, index) => ({
                      heading: section.heading,
                      body: section.body,
                      sortOrder: index
                    }))
                  }
                },
                update: {
                  intro: payload.draft.intro,
                  conclusion: payload.draft.conclusion,
                  sections: {
                    deleteMany: {},
                    create: payload.draft.sections.map((section, index) => ({
                      heading: section.heading,
                      body: section.body,
                      sortOrder: index
                    }))
                  }
                }
              }
            }
          }
        : {}),
      ...(payload.images
        ? {
            articleImages: {
              deleteMany: {},
              create: payload.images.map((image, index) => ({
                id: image.id,
                kind: image.kind,
                src: image.src,
                alt: image.alt,
                caption: image.caption,
                placement: image.placement,
                prompt: image.prompt,
                sectionHeading: image.sectionHeading,
                sortOrder: index
              }))
            }
          }
        : {}),
      ...(payload.facebook
        ? {
            facebookPost: {
              upsert: {
                create: {
                  caption: payload.facebook.caption,
                  hashtags: payload.facebook.hashtags,
                  selectedImageId: payload.facebook.selectedImageId || null,
                  status: payload.facebook.status
                },
                update: {
                  caption: payload.facebook.caption,
                  hashtags: payload.facebook.hashtags,
                  selectedImageId: payload.facebook.selectedImageId || null,
                  status: payload.facebook.status
                }
              }
            }
          }
        : {})
    },
    include: jobInclude
  });

  return withResolvedProvider(fromStoredJob(job));
}

export async function listJobs(scope?: JobAccessScope) {
  if (!isDatabaseConfigured()) {
    return Promise.all(
      Array.from(jobs.values()).map(async (job) => ({
        ...(await withResolvedProvider(cloneJob(job))),
        automationEvents: await listWorkflowEvents(job.id)
      }))
    );
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return Promise.all(
      Array.from(jobs.values()).map(async (job) => ({
        ...(await withResolvedProvider(cloneJob(job))),
        automationEvents: await listWorkflowEvents(job.id)
      }))
    );
  }

  const storedJobs = await prisma.keywordJob.findMany({
    where: scope?.clientId
      ? {
          clientId: scope.clientId
        }
      : undefined,
    include: jobInclude,
    orderBy: {
      createdAt: "desc"
    }
  });

  return Promise.all(storedJobs.map(async (job) => withResolvedProvider(fromStoredJob(job))));
}

export async function getJob(jobId: string, scope?: JobAccessScope) {
  if (!isDatabaseConfigured()) {
    const job = jobs.get(jobId);
    if (!job) return null;
    return {
      ...(await withResolvedProvider(cloneJob(job))),
      automationEvents: await listWorkflowEvents(job.id)
    };
  }

  const prisma = getPrismaClient();
  if (!prisma) return null;
  const job = await prisma.keywordJob.findFirst({
    where: {
      id: jobId,
      ...(scope?.clientId
        ? {
            clientId: scope.clientId
          }
        : {})
    },
    include: jobInclude
  });
  return job ? withResolvedProvider(fromStoredJob(job)) : null;
}

export async function createJob(input: { client: string; seedKeyword: string; clientId?: string | null }) {
  const provider = input.clientId
    ? (await resolveResearchProviderByClientId(input.clientId))
    : await resolveResearchProviderByClientName(input.client);
  const clientPlan = input.clientId
    ? await resolveClientPlanByClientId(input.clientId)
    : await resolveClientPlanByClientName(input.client);
  const job = await buildNewJob(input.seedKeyword, input.client, provider, clientPlan);

  if (!isDatabaseConfigured()) {
    jobs.set(job.id, job);
    return {
      ...(await withResolvedProvider(cloneJob(job))),
      automationEvents: await listWorkflowEvents(job.id)
    };
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    jobs.set(job.id, job);
    return {
      ...cloneJob(job),
      automationEvents: await listWorkflowEvents(job.id)
    };
  }

  const { id: _jobId, ...jobData } = toStoredJob(job);
  const createdJob = await prisma.keywordJob.create({
    data: {
      ...jobData,
      client: input.clientId
        ? {
            connect: {
              id: input.clientId
            }
          }
        : {
            connectOrCreate: {
              where: { name: input.client },
              create: { name: input.client }
            }
          }
    },
    include: jobInclude
  });

  return {
    ...(await withResolvedProvider(fromStoredJob(createdJob))),
    client: input.client
  };
}

function getLatestResearchSummary(job: WorkflowJob) {
  const latestResearchEvent = [...(job.automationEvents ?? [])]
    .filter((event) => event.type === "research")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

  return typeof latestResearchEvent?.payload?.summaryText === "string"
    ? latestResearchEvent.payload.summaryText
    : "";
}

export async function selectIdea(jobId: string, ideaId: string) {
  const job = await getJob(jobId);
  if (!job) return null;

  const selectedIdea = job.ideas.find((idea) => idea.id === ideaId);
  if (!selectedIdea) return null;

  if (isKeywordVariantPhase(job)) {
    const nextKeyword = selectedIdea.title.trim();
    const clientPlan = await resolveJobClientPlan(job);
    const serpSnapshot = await getDataForSeoSerpSnapshot(nextKeyword, clientPlan);
    const topicIdeas = await generateTopicIdeas(nextKeyword, job.researchProvider, serpSnapshot, clientPlan);

    if (!isDatabaseConfigured()) {
      job.seedKeyword = nextKeyword;
      job.stage = "selected";
      job.selectedIdeaId = "";
      job.ideas = topicIdeas;
      job.serpSnapshot = serpSnapshot;
      job.research = createEmptyResearch();
      job.brief = createEmptyBrief();
      job.draft = createEmptyDraft();
      job.images = [];
      job.facebook = createEmptyFacebook();
      jobs.set(job.id, job);
      return cloneJob(job);
    }

    await updateStoredWorkflow(jobId, "selected", {
      seedKeyword: nextKeyword,
      selectedIdeaId: "",
      ideas: topicIdeas,
      research: createEmptyResearch(),
      brief: createEmptyBrief(),
      draft: createEmptyDraft(),
      images: [],
      facebook: createEmptyFacebook()
    });

    if (serpSnapshot) {
      await createWorkflowEvent({
        jobId,
        type: "research",
        status: "succeeded",
        source: "app",
        message: "SERP snapshot ready",
        payload: {
          stage: "serp_snapshot",
          serpSnapshot
        }
      });
    }

    return getJob(jobId);
  }

  if (!isDatabaseConfigured()) {
    job.selectedIdeaId = ideaId;
    job.stage = "selected";
    job.research = createEmptyResearch();
    job.brief = createEmptyBrief();
    job.draft = createEmptyDraft();
    job.images = [];
    job.facebook = createEmptyFacebook();
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "selected", {
    selectedIdeaId: ideaId
  });
}

export async function updateSelectedIdea(
  jobId: string,
  ideaId: string,
  patch: {
    title?: string;
    angle?: string;
  }
) {
  const job = await getJob(jobId);
  if (!job) return null;

  const selectedIdea = job.ideas.find((idea) => idea.id === ideaId);
  if (!selectedIdea) return null;

  const nextTitle = patch.title?.trim() || selectedIdea.title;
  const nextAngle = patch.angle?.trim() || selectedIdea.angle;

  if (!isDatabaseConfigured()) {
    job.ideas = job.ideas.map((idea) =>
      idea.id === ideaId
        ? {
            ...idea,
            title: nextTitle,
            angle: nextAngle
          }
        : idea
    );
    job.selectedIdeaId = ideaId;
    job.stage = "selected";
    job.research = createEmptyResearch();
    job.brief = createEmptyBrief();
    job.draft = createEmptyDraft();
    job.images = [];
    job.facebook = createEmptyFacebook();
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  const prisma = getPrismaClient();
  if (!prisma) return null;

  await prisma.topicIdea.update({
    where: { id: ideaId },
    data: {
      title: nextTitle,
      angle: nextAngle
    }
  });

  return updateStoredWorkflow(jobId, "selected", {
    selectedIdeaId: ideaId,
    research: createEmptyResearch(),
    brief: createEmptyBrief(),
    draft: createEmptyDraft(),
    images: [],
    facebook: createEmptyFacebook()
  });
}

export async function runResearch(jobId: string) {
  const job = await getJob(jobId);
  if (!job) return null;
  const selectedIdea = job.ideas.find((idea) => idea.id === job.selectedIdeaId);
  if (!selectedIdea) return null;
  const provider = await resolveResearchProviderByClientName(job.client);
  const clientPlan = await resolveJobClientPlan(job);
  const research =
    provider === "dataforseo"
      ? (await buildResearchPackFromDataForSeo(job.seedKeyword, selectedIdea, job.serpSnapshot, clientPlan)).research
      : generateResearch(job.seedKeyword, selectedIdea);

  if (!isDatabaseConfigured()) {
    job.research = research;
    job.stage = "researching";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "researching", { research });
}

export async function generateJobBrief(jobId: string, options?: Partial<WorkflowGenerationSettings> | null) {
  const job = await getJob(jobId);
  if (!job) return null;
  const selectedIdea = job.ideas.find((idea) => idea.id === job.selectedIdeaId);
  if (!selectedIdea) return null;
  const settings = normalizeGenerationSettings(options);
  const fallbackBrief = generateBrief(job.seedKeyword, selectedIdea, job.research, {
    sectionCount: settings.sectionCount
  });
  const prisma = getPrismaClient();
  const clientRows =
    prisma && job.client
      ? ((await prisma.$queryRawUnsafe(
          `SELECT "id" FROM "Client" WHERE "name" = $1 LIMIT 1`,
          job.client
        )) as Array<{ id: string }>)
      : [];
  const promptConfig = await getPromptConfig(clientRows[0]?.id ?? null);
  const aiBrief = await generateBriefWithOpenAi({
    seedKeyword: job.seedKeyword,
    selectedIdea,
    research: job.research,
    researchSummary: getLatestResearchSummary(job),
    sectionCount: settings.sectionCount,
    promptConfig,
    editorialPatternName: settings.editorialPattern
  }).catch(() => null);
  const brief = aiBrief
    ? {
        ...fallbackBrief,
        ...job.brief,
        ...aiBrief,
        title: aiBrief.title.trim() || fallbackBrief.title,
        slug: aiBrief.slug.trim() || fallbackBrief.slug,
        metaTitle: aiBrief.metaTitle.trim() || fallbackBrief.metaTitle,
        metaDescription: aiBrief.metaDescription.trim() || fallbackBrief.metaDescription,
        audience: aiBrief.audience.trim() || fallbackBrief.audience,
        angle: aiBrief.angle.trim() || fallbackBrief.angle,
        outline: aiBrief.outline.length > 0 ? aiBrief.outline : fallbackBrief.outline,
        faqs: aiBrief.faqs.length > 0 ? aiBrief.faqs : fallbackBrief.faqs,
        internalLinks: aiBrief.internalLinks.length > 0 ? aiBrief.internalLinks : fallbackBrief.internalLinks,
        publishStatus: job.brief.publishStatus || "draft",
        categoryIds: job.brief.categoryIds,
        tagIds: job.brief.tagIds,
        featuredImageUrl: job.brief.featuredImageUrl
      }
    : fallbackBrief;

  if (!isDatabaseConfigured()) {
    job.brief = brief;
    job.stage = "brief_ready";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "brief_ready", { brief });
}

export async function saveJobBrief(jobId: string, brief: ContentBrief) {
  const job = await getJob(jobId);
  if (!job) return null;

  if (!isDatabaseConfigured()) {
    job.brief = brief;
    job.stage = "brief_ready";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "brief_ready", { brief });
}

export async function generateJobDraft(jobId: string, options?: Partial<WorkflowGenerationSettings> | null) {
  const job = await getJob(jobId);
  if (!job) return null;
  const settings = normalizeGenerationSettings(options);
  const prisma = getPrismaClient();
  const clientRows =
    prisma && job.client
      ? ((await prisma.$queryRawUnsafe(
          `SELECT "id" FROM "Client" WHERE "name" = $1 LIMIT 1`,
          job.client
        )) as Array<{ id: string }>)
      : [];
  const promptConfig = await getPromptConfig(clientRows[0]?.id ?? null);
  const fallbackDraft = generateDraft(job.seedKeyword, job.brief, job.research, {
    sectionCount: settings.sectionCount
  });
  const aiDraft = await generateDraftWithOpenAi({
    seedKeyword: job.seedKeyword,
    brief: {
      ...job.brief,
      outline: job.brief.outline.slice(0, settings.sectionCount)
    },
    research: job.research,
    researchSummary: getLatestResearchSummary(job),
    sectionCount: settings.sectionCount,
    wordsPerSection: settings.wordsPerSection,
    promptConfig,
    editorialPatternName: settings.editorialPattern
  }).catch(() => null);
  const polishedDraft = aiDraft
    ? await polishDraftWithOpenAi({
        seedKeyword: job.seedKeyword,
        brief: {
          ...job.brief,
          outline: job.brief.outline.slice(0, settings.sectionCount)
        },
        draft: aiDraft,
        promptConfig
      }).catch(() => aiDraft)
    : null;
  const candidateDraft = polishedDraft ?? aiDraft;
  const draft =
    candidateDraft &&
    candidateDraft.sections.length > 0 &&
    candidateDraft.sections.some((section) => section.heading.trim() || section.body.trim())
      ? candidateDraft
      : fallbackDraft;
  const images = generateArticleImages({
    seedKeyword: job.seedKeyword,
    title: job.brief.title,
    brief: job.brief,
    draft,
    imageCount: settings.imageCount
  });

  if (!isDatabaseConfigured()) {
    job.draft = draft;
    job.images = images;
    job.stage = "drafting";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "drafting", { draft, images });
}

export async function saveJobDraft(
  jobId: string,
  draft: ArticleDraft,
  options?: Partial<WorkflowGenerationSettings> | null
) {
  const job = await getJob(jobId);
  if (!job) return null;
  const settings = normalizeGenerationSettings(options);
  const images =
    job.images.length > 0
      ? job.images
      : generateArticleImages({
          seedKeyword: job.seedKeyword,
          title: job.brief.title,
          brief: job.brief,
          draft,
          imageCount: settings.imageCount
        });

  if (!isDatabaseConfigured()) {
    job.draft = draft;
    job.images = images;
    job.stage = "review";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "review", { draft, images });
}

export async function saveJobImages(jobId: string, images: ArticleImageAsset[]) {
  const job = await getJob(jobId);
  if (!job) return null;

  const sanitizedImages = images.map((image, index) => ({
    ...image,
    id: image.id || `${jobId}-image-${index + 1}`,
    src: image.src.trim(),
    alt: image.alt.trim(),
    caption: image.caption.trim(),
    placement: image.placement.trim(),
    prompt: image.prompt.trim()
  }));

  const nextSelectedImageId =
    job.facebook.selectedImageId && sanitizedImages.some((image) => image.id === job.facebook.selectedImageId)
      ? job.facebook.selectedImageId
      : sanitizedImages.find((image) => image.src)?.id ?? sanitizedImages[0]?.id ?? "";

  if (!isDatabaseConfigured()) {
    job.images = sanitizedImages;
    job.facebook = {
      ...job.facebook,
      selectedImageId: nextSelectedImageId
    };
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, job.stage, {
    images: sanitizedImages,
    facebook: {
      ...job.facebook,
      selectedImageId: nextSelectedImageId
    }
  });
}

export async function saveFacebookPost(jobId: string, facebook: FacebookPostDraft) {
  const job = await getJob(jobId);
  if (!job) return null;

  if (!isDatabaseConfigured()) {
    job.facebook = facebook;
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, job.stage, { facebook });
}

export async function approveJob(jobId: string) {
  const job = await getJob(jobId);
  if (!job) return null;

  if (!isDatabaseConfigured()) {
    job.stage = "approved";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "approved", {});
}

export async function publishJob(jobId: string) {
  const job = await getJob(jobId);
  if (!job) return null;

  if (!isDatabaseConfigured()) {
    job.stage = "published";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "published", {});
}

export async function regenerateJobImages(jobId: string, options?: Partial<WorkflowGenerationSettings> | null) {
  const job = await getJob(jobId);
  if (!job) return null;
  const settings = normalizeGenerationSettings(options);

  const promptImages = generateArticleImages({
    seedKeyword: job.seedKeyword,
    title: job.brief.title,
    brief: job.brief,
    draft: job.draft,
    imageCount: settings.imageCount
  });
  const images: ArticleImageAsset[] = [];
  const imageGenerationEnabled = isManagedImageGenerationConfigured();
  const clientPlan = await resolveJobClientPlan(job);

  for (const [index, image] of promptImages.entries()) {
    if (imageGenerationEnabled) {
      try {
        const generated = await generateManagedImage({
          prompt: image.prompt,
          width: image.kind === "featured" ? 1600 : 1400,
          height: image.kind === "featured" ? 900 : 840,
          qualityMode: getImageQualityModeForPlan(clientPlan, image.prompt)
        });

        images.push({
          ...image,
          src: generated.src
        });
      } catch {
        images.push(image);
      }
    } else {
      images.push(image);
    }

    if (index < promptImages.length - 1) {
      await wait(1200);
    }
  }

  if (!isDatabaseConfigured()) {
    job.images = images;
    job.facebook = {
      ...job.facebook,
      selectedImageId:
        job.facebook.selectedImageId && images.some((image) => image.id === job.facebook.selectedImageId)
          ? job.facebook.selectedImageId
          : images[0]?.id ?? ""
    };
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, job.stage, {
    images,
    facebook: {
      ...job.facebook,
      selectedImageId:
        job.facebook.selectedImageId && images.some((image) => image.id === job.facebook.selectedImageId)
          ? job.facebook.selectedImageId
          : images[0]?.id ?? ""
    }
  });
}

export async function regenerateJobImageAt(
  jobId: string,
  imageIndex: number,
  options?: Partial<WorkflowGenerationSettings> | null,
  promptOverride?: string | null
) {
  const job = await getJob(jobId);
  if (!job) return null;

  const currentImageCount = Math.max(1, job.images.length || 1);
  const settings = normalizeGenerationSettings({
    ...options,
    imageCount: options?.imageCount ?? currentImageCount
  });
  const promptImages = generateArticleImages({
    seedKeyword: job.seedKeyword,
    title: job.brief.title,
    brief: job.brief,
    draft: job.draft,
    imageCount: settings.imageCount
  });

  if (imageIndex < 0 || imageIndex >= promptImages.length) {
    throw new Error("Image slot not found.");
  }

  const nextImages =
    job.images.length === promptImages.length
      ? [...job.images]
      : promptImages.map((image, index) => job.images[index] ?? image);

  const targetImage = promptImages[imageIndex];
  const existingImage = job.images[imageIndex];
  const resolvedPrompt = promptOverride?.trim() || existingImage?.prompt?.trim() || targetImage.prompt;
  const resolvedTargetImage = {
    ...targetImage,
    prompt: resolvedPrompt
  };
  const clientPlan = await resolveJobClientPlan(job);

  if (isManagedImageGenerationConfigured()) {
    const generated = await generateManagedImage({
      prompt: resolvedTargetImage.prompt,
      width: resolvedTargetImage.kind === "featured" ? 1600 : 1400,
      height: resolvedTargetImage.kind === "featured" ? 900 : 840,
      qualityMode: getImageQualityModeForPlan(clientPlan, resolvedTargetImage.prompt)
    });

    nextImages[imageIndex] = {
      ...resolvedTargetImage,
      src: generated.src
    };
  } else {
    nextImages[imageIndex] = resolvedTargetImage;
  }

  if (!isDatabaseConfigured()) {
    job.images = nextImages;
    job.facebook = {
      ...job.facebook,
      selectedImageId:
        job.facebook.selectedImageId && nextImages.some((image) => image.id === job.facebook.selectedImageId)
          ? job.facebook.selectedImageId
          : nextImages[0]?.id ?? ""
    };
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, job.stage, {
    images: nextImages,
    facebook: {
      ...job.facebook,
      selectedImageId:
        job.facebook.selectedImageId && nextImages.some((image) => image.id === job.facebook.selectedImageId)
          ? job.facebook.selectedImageId
          : nextImages[0]?.id ?? ""
    }
  });
}

export async function applyAutomationResult(input: {
  jobId: string;
  type: "research" | "brief" | "draft" | "images" | "publish" | "facebook";
  stage?: AppWorkflowStage;
  research?: ResearchPack;
  brief?: ContentBrief;
  draft?: ArticleDraft;
  images?: ArticleImageAsset[];
  facebook?: FacebookPostDraft;
}) {
  const job = await getJob(input.jobId);
  if (!job) return null;

  const nextStage =
    input.stage ??
    (input.type === "publish"
      ? "published"
      : input.type === "images"
        ? job.stage
      : input.type === "draft"
        ? "drafting"
        : input.type === "brief"
          ? "brief_ready"
          : "researching");

  if (!isDatabaseConfigured()) {
    if (input.research) {
      job.research = input.research;
    }
    if (input.brief) {
      job.brief = input.brief;
    }
    if (input.draft) {
      job.draft = input.draft;
    }
    if (input.images) {
      job.images = input.images;
    }
    if (input.facebook) {
      job.facebook = input.facebook;
    }
    job.stage = nextStage;
    jobs.set(job.id, job);
    return {
      ...cloneJob(job),
      automationEvents: await listWorkflowEvents(job.id)
    };
  }

  return updateStoredWorkflow(input.jobId, nextStage, {
    research: input.research,
    brief: input.brief,
    draft: input.draft,
    images: input.images,
    facebook: input.facebook
  });
}
