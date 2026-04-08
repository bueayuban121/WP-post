"use client";

import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import type { AppUserSession } from "@/lib/auth";
import type {
  ArticleImageAsset,
  ArticleDraft,
  ContentBrief,
  TopicIdea,
  WorkflowAutomationEvent,
  WorkflowGenerationSettings,
  WorkflowJob
} from "@/types/workflow";
import { ConsoleNav } from "@/components/console-nav";
import { SettingsPanel, tonePresets } from "@/components/workspace/SettingsPanel";
import { ProjectCreateForm } from "@/components/workspace/ProjectCreateForm";
import { KeywordExpansionTab } from "@/components/workspace/KeywordExpansionTab";
import { ResearchTab } from "@/components/workspace/ResearchTab";
import { QueueTab } from "@/components/workspace/QueueTab";
import { ArticleStudioTab } from "@/components/workspace/ArticleStudioTab";
import { ArticleImagesTab } from "@/components/workspace/ArticleImagesTab";
import { buildLongResearchSummary } from "@/lib/research-copy";
import {
  buildArticleImagePrompt,
  inferArticleImageOverlayText,
  inferArticleImageTextMode,
  suggestArticleImageOverlayText,
  type ArticleImageTextMode
} from "@/lib/article-images";
import styles from "./workflow-dashboard.module.css";

type WorkspaceTab = "expand" | "research" | "queue" | "article" | "images";
type LoadState = "loading" | "ready" | "empty" | "error";
type WorkflowStepState = "complete" | "active" | "locked";
type PendingAction =
  | ""
  | "create-project"
  | "select-keyword"
  | "save-keyword"
  | "run-research"
  | "create-article"
  | "save-brief"
  | "save-draft"
  | "save-images"
  | "generate-images"
  | "suggest-image-copy"
  | "regenerate-image"
  | "regenerate-pattern"
  | "approve"
  | "publish";
const settingsStorageKey = "auto-post-content-settings";

type EditorialPatternPreview = {
  name: string;
  label: string;
  description: string;
};

type PageMode = "home" | "keywords" | "articles";

type PagePresentation = {
  heroClassName: string;
  shellClassName: string;
  kicker: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
};

const stageLabels = {
  idea_pool: "Keyword Expansion",
  selected: "Topic Planning",
  researching: "Research Ready",
  brief_ready: "Brief Ready",
  drafting: "Draft Ready",
  review: "In Review",
  approved: "Approved",
  published: "Published"
} as const;

const automationLabels: Record<WorkflowAutomationEvent["status"], string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed"
};

const automationTypeLabels: Record<WorkflowAutomationEvent["type"], string> = {
  research: "Research",
  brief: "Brief",
  draft: "Draft",
  images: "Images",
  publish: "Publish",
  facebook: "Social"
};

const pagePresentations: Record<PageMode, PagePresentation> = {
  home: {
    heroClassName: styles.heroHome,
    shellClassName: styles.shellHome,
    kicker: "EDITORIAL FLOW",
    title: "Turn one keyword into a finished story.",
    description:
      "Move from seed keyword to selection, research, article drafting, image planning, and WordPress delivery in one focused editorial workflow.",
    primaryCta: "New Project",
    secondaryCta: "Open Flow"
  },
  keywords: {
    heroClassName: styles.heroKeywords,
    shellClassName: styles.shellKeywords,
    kicker: "DISCOVERY",
    title: "Shape a cleaner keyword path before writing.",
    description:
      "Use this workspace to expand seed keywords, choose the strongest direction, and pass a cleaner input into topic planning and research.",
    primaryCta: "Start Search",
    secondaryCta: "View Flow"
  },
  articles: {
    heroClassName: styles.heroArticles,
    shellClassName: styles.shellArticles,
    kicker: "STUDIO",
    title: "Refine the brief, draft, and image direction.",
    description:
      "This page is tuned for editorial review: shaping the brief, polishing the draft, checking pattern choice, and preparing the article for publish.",
    primaryCta: "Open Studio",
    secondaryCta: "Jump Draft"
  }
};


const editorialPatternPreviews: EditorialPatternPreview[] = [
  {
    name: "problem-solution",
    label: "Problem-Solution",
    description: "เปิดจากปัญหาหรือความสับสนของคนอ่าน แล้วค่อยพาไปสู่คำอธิบายและแนวทางแก้"
  },
  {
    name: "buyer-guide",
    label: "Buyer Guide",
    description: "เน้นช่วยคนอ่านประเมินตัวเลือก เปรียบเทียบ และตัดสินใจได้ง่ายขึ้น"
  },
  {
    name: "expert-explainer",
    label: "Expert Explainer",
    description: "อธิบายเรื่องยากให้เข้าใจง่ายขึ้นแบบผู้เชี่ยวชาญที่เล่าเป็น"
  },
  {
    name: "myth-vs-reality",
    label: "Myth vs Reality",
    description: "หยิบความเข้าใจผิดหรือสิ่งที่คนมักคิดผิดมาอธิบายให้ชัดขึ้น"
  },
  {
    name: "decision-checklist",
    label: "Decision Checklist",
    description: "จัดเนื้อหาให้คนอ่านค่อย ๆ เช็กปัจจัยสำคัญก่อนตัดสินใจ"
  }
];

const editorialPatternOrder = editorialPatternPreviews.map((pattern) => pattern.name);

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function pickEditorialPatternPreview(parts: string[]) {
  const key = parts.join(" | ").trim();
  const patternIndex = hashText(key) % editorialPatternPreviews.length;
  return editorialPatternPreviews[patternIndex];
}

function resolveEditorialPatternPreview(parts: string[], overrideName?: string) {
  if (overrideName) {
    const matched = editorialPatternPreviews.find((pattern) => pattern.name === overrideName.trim());
    if (matched) {
      return matched;
    }
  }

  return pickEditorialPatternPreview(parts);
}

function getProjectName(name: string) {
  return name.trim() || "Untitled Project";
}

async function downloadFile(url: string, fallbackName: string) {
  const response = await fetch(url, {
    credentials: "include"
  });

  if (!response.ok) {
    let message = "Download failed.";

    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) {
        message = data.error;
      }
    } catch {
      // Ignore JSON parsing errors and keep the generic message.
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  anchor.href = objectUrl;
  anchor.download = match?.[1] ?? fallbackName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

function splitParagraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function buildResearchSummary(seedKeyword: string, idea: TopicIdea | null, job: WorkflowJob | null) {
  if (!idea || !job || !job.research.sources.length) {
    return "";
  }

  const latestResearchEvent = [...(job.automationEvents ?? [])]
    .filter((event) => event.type === "research")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  const summaryHooks =
    typeof latestResearchEvent?.payload?.summaryHooks === "string"
      ? latestResearchEvent.payload.summaryHooks
      : "";
  const summaryText =
    typeof latestResearchEvent?.payload?.summaryText === "string"
      ? latestResearchEvent.payload.summaryText
      : "";

  if (summaryText.trim()) {
    return summaryText.trim();
  }

  return buildLongResearchSummary({
    seedKeyword,
    idea,
    job,
    summaryHooks
  });

  /* const sourceNarrative = job.research.sources
    .map(
      (source, index) =>
        `Source ${index + 1}: ${source.title} จาก ${source.source} ชี้ให้เห็นว่า ${source.insight} ประเด็นนี้ช่วยยืนยันว่าคนที่ค้นคำว่า ${idea.title} ไม่ได้ต้องการแค่คำตอบสั้น แต่ต้องการความเข้าใจที่แปลเป็นการดูแลจริงได้ทันที`
    )
    .join(" ");

  const gapNarrative = job.research.gaps
    .map(
      (gap) =>
        `ช่องว่างสำคัญที่ต้องปิดคือ ${gap} ดังนั้นบทความควรแปลข้อมูลเชิงเทคนิคเป็นภาษาที่คนไทยอ่านง่ายและนำไปใช้ได้จริง`
    )
    .join(" ");

  const repeatedSection = [
    `หัวข้อ ${idea.title} ควรถูกเล่าแบบค่อยเป็นค่อยไป เริ่มจากคำตอบสั้นที่ชัดเจน แล้วค่อยขยายเหตุผลเชิงลึกว่าทำไมข้อมูลนี้จึงสำคัญกับคนที่กำลังเลี้ยง ${seedKeyword} อยู่จริง`,
    `จากข้อมูลฝั่งไทยจะเห็นชัดว่าผู้ใช้มักถามด้วยภาษาง่าย ๆ และมองหาวิธีแก้ปัญหาทันที ไม่ได้ต้องการศัพท์วิชาการล้วน ดังนั้นบทความควรใช้ภาษาไทยเป็นหลัก แต่อนุญาตให้แทรกชื่อแหล่งอ้างอิงและคำเทคนิคอังกฤษในจุดที่ช่วยให้เนื้อหาดูน่าเชื่อถือขึ้น`,
    `ฝั่งต่างประเทศให้กรอบคิดที่ละเอียดกว่า ทั้งเรื่องวิธีสังเกตอาการ การวิเคราะห์สภาพแวดล้อม และขั้นตอนแก้ปัญหาอย่างปลอดภัย จุดแข็งของระบบนี้คือเราสามารถรวบรวมข้อมูลเหล่านั้น แล้วจัดระเบียบใหม่ให้สอดคล้องกับบริบทของผู้ใช้งานไทย`,
    `ในมุม SEO บทความนี้ควรตอบ intent ให้ครบทั้ง informational และ problem-solving โดยต้องมีทั้งคำตอบทันที โครงสร้างหัวข้อที่ชัด และส่วน FAQ ที่ตอบคำถามรองที่ผู้ใช้มักค้นต่อจากคีย์เวิร์ดหลัก`,
    `อีกจุดที่สำคัญคือบทความไม่ควรอธิบายแค่ตัวแปรเดียว เช่น เรื่องน้ำ อาหาร หรืออุณหภูมิแบบแยกขาดกัน แต่ควรเชื่อมภาพรวมให้เห็นว่าปัจจัยเหล่านี้สัมพันธ์กันอย่างไร และแต่ละปัจจัยส่งผลต่อสุขภาพหรือพฤติกรรมของ ${seedKeyword} อย่างไร`,
    `สำหรับงานส่งลูกค้า เนื้อหาควรถูกเรียงให้ดูเป็นบทความมืออาชีพ มีบทนำที่บอกสิ่งที่ผู้อ่านจะได้ มี section กลางที่พาไล่ประเด็นสำคัญทีละขั้น และมีบทสรุปที่ช่วยให้ผู้อ่านตัดสินใจว่าจะดูแลอย่างไรต่อหรือต้องระวังอะไรเพิ่มเติม`
  ].join(" ");

  return [
    `Research focus: ${idea.title}.`,
    `Objective: ${job.research.objective}.`,
    `Audience: ${job.research.audience}.`,
    summaryHooks,
    sourceNarrative,
    gapNarrative,
    repeatedSection,
    repeatedSection,
    repeatedSection
  ].join(" ");
}

*/
}

async function readJson(response: Response) {
  const data = (await response.json()) as { error?: string; job?: WorkflowJob; jobs?: WorkflowJob[] };
  if (response.status === 401 || response.status === 403) {
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
    throw new Error(data.error ?? "Session expired.");
  }
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

function getLatestEvent(job: WorkflowJob, type: WorkflowAutomationEvent["type"]) {
  return [...(job.automationEvents ?? [])]
    .filter((event) => event.type === type)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

export function WorkflowDashboard({
  initialTab = "expand",
  initialJobId = "",
  currentUser,
  managedUsers = [],
  pageMode = "home"
}: {
  initialTab?: WorkspaceTab;
  initialJobId?: string;
  currentUser: AppUserSession;
  managedUsers?: AppUserSession[];
  pageMode?: PageMode;
}) {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [activeJobId, setActiveJobId] = useState("");
  const availableClientAccounts = managedUsers
    .filter((user) => user.role === "client" && user.clientId && user.clientName)
    .map((user) => ({
      id: user.clientId as string,
      name: user.clientName as string
    }))
    .filter((account, index, accounts) => accounts.findIndex((item) => item.id === account.id) === index);
  const [selectedClientId, setSelectedClientId] = useState(() => {
    if (currentUser.role === "client") {
      return currentUser.clientId ?? "";
    }

    return availableClientAccounts[0]?.id ?? "";
  });
  const [seedKeyword, setSeedKeyword] = useState("ปลาทอง");
  const [tone, setTone] = useState("Calm expert");
  const [bannedWords, setBannedWords] = useState("ดีที่สุด, การันตี, รักษาหาย");
  const [articleLength, setArticleLength] = useState("500-700");
  const [imageCount, setImageCount] = useState("3");
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [statusMessage, setStatusMessage] = useState("Loading workspace");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>("");

  const [briefTitle, setBriefTitle] = useState("");
  const [briefMetaTitle, setBriefMetaTitle] = useState("");
  const [briefMetaDescription, setBriefMetaDescription] = useState("");
  const [briefSlug, setBriefSlug] = useState("");
  const [briefFeaturedImageUrl, setBriefFeaturedImageUrl] = useState("");
  const [draftIntro, setDraftIntro] = useState("");
  const [draftConclusion, setDraftConclusion] = useState("");
  const [draftSections, setDraftSections] = useState<ArticleDraft["sections"]>([]);
  const [editableImages, setEditableImages] = useState<ArticleImageAsset[]>([]);
  const [selectedIdeaTitle, setSelectedIdeaTitle] = useState("");
  const [selectedIdeaAngle, setSelectedIdeaAngle] = useState("");
  const [editorialPatternOverride, setEditorialPatternOverride] = useState("");
  const selectedClientAccount =
    currentUser.role === "client"
      ? {
          id: currentUser.clientId ?? "",
          name: currentUser.clientName ?? ""
        }
      : availableClientAccounts.find((account) => account.id === selectedClientId) ?? null;

  const job = jobs.find((item) => item.id === activeJobId) ?? jobs[0] ?? null;
  const activeIdea = job?.ideas.find((idea) => idea.id === job.selectedIdeaId) ?? null;
  const usingDataForSeo = job?.researchProvider === "dataforseo";
  const inKeywordVariantPhase = Boolean(job && usingDataForSeo && job.stage === "idea_pool");
  const inTopicSelectionPhase = Boolean(job && usingDataForSeo && job.stage === "selected" && !job.selectedIdeaId);
  const articleImages = editableImages.length > 0 ? editableImages : job?.images ?? [];
  const articleSections = draftSections.length > 0 ? draftSections : job?.draft.sections ?? [];
  const editorialPattern = job
    ? resolveEditorialPatternPreview(
        [
          job.seedKeyword,
          job.brief.title || activeIdea?.title || "",
          job.brief.angle || activeIdea?.angle || "",
          job.brief.audience || job.research.audience || ""
        ],
        editorialPatternOverride
      )
    : null;
  const featuredImageSrc =
    briefFeaturedImageUrl.trim() || articleImages[0]?.src || "/article-images/goldfish-water-1.svg";
  const researchSummary = buildResearchSummary(job?.seedKeyword ?? "", activeIdea, job);
  const hasSelectedIdea = Boolean(activeIdea);
  const selectedKeywordLabel = job?.seedKeyword ?? "";
  const selectedTopicLabel = activeIdea?.title ?? "";
  const hasResearch = Boolean(job?.research.sources.length);
  const hasDraft = Boolean(job?.draft.sections.length);
  const imageEvent = job ? getLatestEvent(job, "images") : undefined;
  const pagePresentation = pagePresentations[pageMode];
  const imageStatusLabel = imageEvent
    ? imageEvent.status === "running"
      ? "Generating images..."
      : imageEvent.status === "queued"
        ? "Waiting for image generation..."
        : imageEvent.status === "succeeded"
          ? "Images ready"
          : "Image generation failed"
    : hasDraft
      ? "Images not generated yet"
      : "Create the article first";
  const imageErrorCount =
    typeof imageEvent?.payload?.errorCount === "number" ? imageEvent.payload.errorCount : 0;

  function hydrate(nextJob: WorkflowJob) {
    setBriefTitle(nextJob.brief.title);
    setBriefMetaTitle(nextJob.brief.metaTitle);
    setBriefMetaDescription(nextJob.brief.metaDescription);
    setBriefSlug(nextJob.brief.slug);
    setBriefFeaturedImageUrl(nextJob.brief.featuredImageUrl);
    setDraftIntro(nextJob.draft.intro);
    setDraftConclusion(nextJob.draft.conclusion);
    setDraftSections(nextJob.draft.sections);
    setEditableImages(nextJob.images);
    const nextIdea = nextJob.ideas.find((idea) => idea.id === nextJob.selectedIdeaId);
    setSelectedIdeaTitle(nextIdea?.title ?? "");
    setSelectedIdeaAngle(nextIdea?.angle ?? "");
    setEditorialPatternOverride("");
  }

  const loadJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const data = await readJson(response);
      const nextJobs = data.jobs ?? [];
      const nextJob =
        nextJobs.find((item) => item.id === initialJobId) ??
        nextJobs[0] ??
        null;
      setJobs(nextJobs);
      setActiveJobId(nextJob?.id ?? "");
      if (nextJob) {
        hydrate(nextJob);
      }
      setLoadState(nextJobs.length > 0 ? "ready" : "empty");
      setStatusMessage(nextJobs.length > 0 ? "Workspace ready" : "No project yet");
      setError("");
    } catch (loadError) {
      setLoadState("error");
      setStatusMessage("Load failed");
      setError(loadError instanceof Error ? loadError.message : "Load failed");
    }
  }, [initialJobId]);

  useEffect(() => {
    void loadJobs();
  }, [initialJobId, loadJobs]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(settingsStorageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<{
        tone: string;
        restrictedWords: string;
        articleLength: string;
        imageCount: string;
      }>;

      if (typeof parsed.tone === "string") {
        setTone(parsed.tone);
      }

      if (typeof parsed.restrictedWords === "string") {
        setBannedWords(parsed.restrictedWords);
      }

      if (typeof parsed.articleLength === "string") {
        setArticleLength(parsed.articleLength);
      }

      if (typeof parsed.imageCount === "string") {
        setImageCount(parsed.imageCount);
      }
    } catch {
      window.localStorage.removeItem(settingsStorageKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      settingsStorageKey,
      JSON.stringify({
        tone,
        restrictedWords: bannedWords,
        articleLength,
        imageCount
      })
    );
  }, [articleLength, bannedWords, imageCount, tone]);

  useEffect(() => {
    if (job) {
      hydrate(job);
    }
  }, [job]);

  function getGenerationSettings(): WorkflowGenerationSettings {
    const parsedImageCount = Number.parseInt(imageCount, 10);
    const safeImageCount = Number.isFinite(parsedImageCount) ? parsedImageCount : 3;

    return {
      imageCount: safeImageCount,
      sectionCount: Math.max(1, Math.min(safeImageCount - 1, 3)),
      wordsPerSection: articleLength.trim() || "500-700",
      editorialPattern: editorialPatternOverride || undefined
    };
  }

  function replaceJob(nextJob: WorkflowJob, message: string, nextTab?: WorkspaceTab) {
    setJobs((current) =>
      current.some((item) => item.id === nextJob.id)
        ? current.map((item) => (item.id === nextJob.id ? nextJob : item))
        : [nextJob, ...current]
    );
    setActiveJobId(nextJob.id);
    hydrate(nextJob);
    setLoadState("ready");
    setStatusMessage(message);
    setError("");
    if (nextTab) {
      setTab(nextTab);
    }
  }

  async function postJob(path: string, body?: unknown, message = "Updated", nextTab?: WorkspaceTab) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await readJson(response);
    if (!data.job) {
      throw new Error("Job payload missing.");
    }
    replaceJob(data.job, message, nextTab);
    return data.job as WorkflowJob;
  }

  async function fetchJob(jobId: string) {
    const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
    const data = await readJson(response);
    if (!data.job) {
      throw new Error("Job payload missing.");
    }
    return data.job;
  }

  async function waitForAutomation(jobId: string, type: WorkflowAutomationEvent["type"]) {
    const maxAttempts = 18;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const nextJob = await fetchJob(jobId);
        replaceJob(
          nextJob,
          `${type} workflow running`,
          type === "research" ? "research" : type === "images" ? "images" : "article"
        );
      const event = getLatestEvent(nextJob, type);

      if (!event) {
        continue;
      }

      if (event.status === "failed") {
        throw new Error(event.message ?? `${type} failed.`);
      }

      if (event.status === "succeeded") {
        return nextJob;
      }
    }

    throw new Error(`${type} timed out. Check Queue for the latest status.`);
  }

  async function queueAutomation(
    type: "research" | "brief" | "draft" | "images" | "publish",
    queuedMessage: string,
    successMessage: string,
    nextTab?: WorkspaceTab
  ) {
    if (!job) return null;

    const response = await fetch(`/api/jobs/${job.id}/automation/${type}`, { method: "POST" });
    const data = (await response.json()) as {
      error?: string;
      job?: WorkflowJob;
      event?: WorkflowAutomationEvent;
      automation?: { message?: string; accepted?: boolean; fallbackApplied?: boolean };
    };

    if (!response.ok) {
      throw new Error(data.error ?? `${type} failed.`);
    }

    if (data.job) {
      replaceJob(data.job, data.automation?.message ?? queuedMessage, nextTab ?? tab);
    }

    const nextJob = await waitForAutomation(job.id, type);
    replaceJob(nextJob, successMessage, nextTab ?? tab);
    return nextJob;
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setPendingAction("create-project");
      setStatusMessage("Creating project");
      setError("");
      try {
        if (!selectedClientAccount?.name) {
          throw new Error("Please select a client account before creating the job.");
        }

        await postJob(
          "/api/jobs",
          {
            client: selectedClientAccount.name,
            clientId: selectedClientAccount.id,
            seedKeyword
          },
          `Created keyword workflow for ${getProjectName(selectedClientAccount.name)}`,
          "expand"
        );
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "Create failed");
      } finally {
        setPendingAction("");
      }
    });
  }

  async function selectKeyword(idea: TopicIdea) {
    if (!job) return;
    startTransition(async () => {
      setPendingAction("select-keyword");
      setStatusMessage(inKeywordVariantPhase ? "Selecting keyword variant" : "Selecting article topic");
      setError("");
      try {
        const selectedJob = await postJob(
          `/api/jobs/${job.id}/ideas/select`,
          { ideaId: idea.id },
          inKeywordVariantPhase
            ? `Keyword selected: ${idea.title}. Article topics are ready below.`
            : `Selected topic: ${idea.title}`,
          inKeywordVariantPhase ? "expand" : "research"
        );

        if (!inKeywordVariantPhase) {
          const generationSettings = getGenerationSettings();
          const researchedJob = await postJob(
            `/api/jobs/${selectedJob.id}/research`,
            undefined,
            "Research summary ready",
            "research"
          );
          await postJob(
            `/api/jobs/${researchedJob.id}/brief`,
            { generationSettings },
            "Brief ready",
            "article"
          );
          await postJob(
            `/api/jobs/${researchedJob.id}/draft`,
            { generationSettings },
            "Article generated",
            "article"
          );
        }
      } catch (selectError) {
        setError(selectError instanceof Error ? selectError.message : "Select failed");
      } finally {
        setPendingAction("");
      }
    });
  }

  async function saveSelectedKeyword() {
    if (!job || !activeIdea || inKeywordVariantPhase) return;

    startTransition(async () => {
      setPendingAction("save-keyword");
      setStatusMessage("Saving selected topic");
      setError("");
      try {
        await postJob(
          `/api/jobs/${job.id}/ideas/select`,
          {
            ideaId: activeIdea.id,
            title: selectedIdeaTitle,
            angle: selectedIdeaAngle
          },
          "Selected topic updated",
          "expand"
        );
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Save failed");
      } finally {
        setPendingAction("");
      }
    });
  }

  async function runResearch() {
    if (!job) return;
    startTransition(async () => {
      setPendingAction("run-research");
      setStatusMessage("Queueing research");
      setError("");
      try {
        await queueAutomation("research", "Research queued in n8n", "Research summary ready", "research");
      } catch (researchError) {
        setError(researchError instanceof Error ? researchError.message : "Research failed");
      } finally {
        setPendingAction("");
      }
    });
  }

  async function createArticle() {
    if (!job) return;
    startTransition(async () => {
      setPendingAction("create-article");
      setStatusMessage("Generating article");
      setError("");
      try {
        const generationSettings = getGenerationSettings();
        await postJob(`/api/jobs/${job.id}/brief`, { generationSettings }, "Brief ready", "article");
        await postJob(`/api/jobs/${job.id}/draft`, { generationSettings }, "Article generated", "article");
      } catch (draftError) {
        setError(draftError instanceof Error ? draftError.message : "Draft failed");
      } finally {
        setPendingAction("");
      }
    });
  }

  async function regenerateArticleWithAnotherPattern() {
    if (!job || !editorialPattern) return;

    const currentIndex = editorialPatternOrder.indexOf(editorialPattern.name);
    const nextPatternName =
      editorialPatternOrder[(currentIndex + 1 + editorialPatternOrder.length) % editorialPatternOrder.length];
    const nextPattern = editorialPatternPreviews.find((pattern) => pattern.name === nextPatternName);

    setEditorialPatternOverride(nextPatternName);

    startTransition(async () => {
      setPendingAction("regenerate-pattern");
      setStatusMessage(`Regenerating article with ${nextPattern?.label ?? nextPatternName}`);
      setError("");
      try {
        const generationSettings = {
          ...getGenerationSettings(),
          editorialPattern: nextPatternName
        };
        await postJob(`/api/jobs/${job.id}/brief`, { generationSettings }, "Brief regenerated", "article");
        await postJob(`/api/jobs/${job.id}/draft`, { generationSettings }, "Article regenerated with a new pattern", "article");
      } catch (draftError) {
        setError(draftError instanceof Error ? draftError.message : "Article regeneration failed");
      } finally {
        setPendingAction("");
      }
    });
  }

  async function saveBrief() {
    if (!job) return;
    const brief: ContentBrief = {
      ...job.brief,
      title: briefTitle,
      metaTitle: briefMetaTitle,
      metaDescription: briefMetaDescription,
      slug: briefSlug,
      featuredImageUrl: briefFeaturedImageUrl
    };

    startTransition(async () => {
      setPendingAction("save-brief");
      setStatusMessage("Saving brief");
      setError("");
      try {
        await postJob(`/api/jobs/${job.id}/brief`, brief, "Brief saved", "article");
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Save failed");
      } finally {
        setPendingAction("");
      }
    });
  }

  async function saveDraft() {
    if (!job) return;
    const draft: ArticleDraft = {
      ...job.draft,
      intro: draftIntro,
      conclusion: draftConclusion,
      sections: draftSections
    };

    startTransition(async () => {
      setPendingAction("save-draft");
      setStatusMessage("Saving draft");
      setError("");
      try {
        await postJob(
          `/api/jobs/${job.id}/draft`,
          {
            ...draft,
            generationSettings: getGenerationSettings()
          },
          "Draft saved",
          "article"
        );
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Save failed");
      } finally {
        setPendingAction("");
      }
    });
  }

  function updateDraftSection(index: number, field: "heading" | "body", value: string) {
    setDraftSections((current) =>
      current.map((section, sectionIndex) =>
        sectionIndex === index
          ? {
              ...section,
              [field]: value
            }
          : section
      )
    );
  }

  function updateImageAsset(index: number, field: keyof ArticleImageAsset, value: string) {
    setEditableImages((current) =>
      current.map((image, imageIndex) =>
        imageIndex === index
          ? {
              ...image,
              [field]: value
            }
          : image
      )
    );
  }

  function getSectionBodyForImage(image: ArticleImageAsset) {
    if (!image.sectionHeading) {
      return "";
    }

    const matchedSection = draftSections.find((section) => section.heading === image.sectionHeading);
    return matchedSection?.body ?? "";
  }

  function rebuildImagePrompt(image: ArticleImageAsset, overrides?: {
    textMode?: ArticleImageTextMode;
    overlayText?: string;
    layoutHint?: string;
    styleNote?: string;
  }) {
    if (!job) {
      return image.prompt;
    }

    return buildArticleImagePrompt({
      seedKeyword: job.seedKeyword,
      title: briefTitle || job.brief.title || job.seedKeyword,
      angle: job.brief.angle,
      audience: job.brief.audience,
      placement: image.placement,
      sectionHeading: image.sectionHeading,
      sectionBody: getSectionBodyForImage(image),
      intro: draftIntro || job.draft.intro,
      conclusion: draftConclusion || job.draft.conclusion,
      textMode: overrides?.textMode ?? inferArticleImageTextMode(image.prompt),
      layoutHint: overrides?.layoutHint,
      styleNote: overrides?.styleNote,
      overlayText: (
        overrides?.overlayText ??
        inferArticleImageOverlayText(image.prompt) ??
        suggestArticleImageOverlayText({
          seedKeyword: job.seedKeyword,
          title: briefTitle || job.brief.title || job.seedKeyword,
          placement: image.placement,
          sectionHeading: image.sectionHeading,
          angle: job.brief.angle
        })
      )
    });
  }

  function applyImageTextMode(index: number, mode: ArticleImageTextMode) {
    setEditableImages((current) =>
      current.map((image, imageIndex) =>
        imageIndex === index
          ? {
              ...image,
              prompt: rebuildImagePrompt(image, {
                textMode: mode,
                overlayText:
                  mode === "no_text"
                    ? ""
                    : inferArticleImageOverlayText(image.prompt) ||
                      suggestArticleImageOverlayText({
                        seedKeyword: job.seedKeyword,
                        title: briefTitle || job.brief.title || job.seedKeyword,
                        placement: image.placement,
                        sectionHeading: image.sectionHeading,
                        angle: job.brief.angle
                      })
              })
            }
          : image
      )
    );
  }

  function applyImageOverlayText(index: number, text: string) {
    setEditableImages((current) =>
      current.map((image, imageIndex) =>
        imageIndex === index
          ? {
              ...image,
              prompt: rebuildImagePrompt(image, {
                textMode: "text_overlay",
                overlayText: text
              })
            }
          : image
      )
    );
  }

  async function suggestImageCopy(index: number) {
    if (!job) return;

    startTransition(async () => {
      setPendingAction("suggest-image-copy");
      setStatusMessage(`Generating AI copy for image ${index + 1}`);
      setError("");

      try {
        const response = await fetch(`/api/jobs/${job.id}/images/copy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            imageIndex: index
          })
        });
        const data = (await response.json()) as {
          error?: string;
          overlayText?: string;
          layoutHint?: string;
          styleNote?: string;
          prompt?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "AI image copy generation failed.");
        }

        setEditableImages((current) =>
          current.map((image, imageIndex) =>
            imageIndex === index
              ? {
                  ...image,
                  prompt:
                    data.prompt ??
                    rebuildImagePrompt(image, {
                      textMode: "text_overlay",
                      overlayText: data.overlayText ?? inferArticleImageOverlayText(image.prompt),
                      layoutHint: data.layoutHint,
                      styleNote: data.styleNote
                    })
                }
              : image
          )
        );

        setStatusMessage(`AI copy ready for image ${index + 1}`);
      } catch (suggestError) {
        setError(suggestError instanceof Error ? suggestError.message : "AI image copy generation failed");
      } finally {
        setPendingAction("");
      }
    });
  }

  function removeImageAsset(index: number) {
    setEditableImages((current) =>
      current.map((image, imageIndex) =>
        imageIndex === index
          ? {
              ...image,
              src: "",
              alt: image.alt || "Image removed from layout"
            }
          : image
      )
    );
  }

  function restoreImageAsset(index: number) {
    const original = job?.images[index];
    if (!original) return;

    setEditableImages((current) =>
      current.map((image, imageIndex) => (imageIndex === index ? original : image))
    );
  }

  async function replaceImageFromFile(index: number, file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Image file could not be loaded."));
      reader.readAsDataURL(file);
    });

    setEditableImages((current) =>
      current.map((image, imageIndex) =>
        imageIndex === index
          ? {
              ...image,
              src: dataUrl
            }
          : image
      )
    );
  }

  async function saveImages() {
    if (!job) return;

    startTransition(async () => {
      setPendingAction("save-images");
      setStatusMessage("Saving image edits");
      setError("");
      try {
        await postJob(
          `/api/jobs/${job.id}/images`,
          {
            images: editableImages
          },
          "Image edits saved",
          "images"
        );
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Save failed");
      } finally {
        setPendingAction("");
      }
    });
  }

  async function refreshActiveJob() {
    if (!job) {
      await loadJobs();
      return;
    }

    startTransition(async () => {
      setStatusMessage("Refreshing image status");
      setError("");

      try {
        const response = await fetch(`/api/jobs/${job.id}`, { cache: "no-store" });
        const data = await readJson(response);
        if (!data.job) {
          throw new Error("Job payload missing.");
        }
        replaceJob(data.job, "Image status refreshed", "images");
      } catch (refreshError) {
        setError(refreshError instanceof Error ? refreshError.message : "Refresh failed");
      }
    });
  }

  async function regenerateSingleImage(index: number) {
    if (!job) return;

    startTransition(async () => {
      setPendingAction("regenerate-image");
      setStatusMessage(`Generating image ${index + 1}`);
      setError("");

      try {
        await postJob(
          `/api/jobs/${job.id}/images`,
          {
            generationSettings: getGenerationSettings(),
            imageIndex: index,
            promptOverride: editableImages[index]?.prompt ?? ""
          },
          `Image ${index + 1} ready`,
          "images"
        );
      } catch (regenerateError) {
        setError(regenerateError instanceof Error ? regenerateError.message : "Image generation failed");
      } finally {
        setPendingAction("");
      }
    });
  }

  async function downloadImageAsset(image: ArticleImageAsset, index: number) {
    if (!image.src.trim() || !job) return;

    startTransition(async () => {
      setStatusMessage(`Preparing image ${index + 1} download`);
      setError("");

      try {
        const anchor = document.createElement("a");
        anchor.href = `/api/jobs/${job.id}/images/${index}/download`;
        anchor.download = "";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setStatusMessage(`Image ${index + 1} downloaded`);
      } catch (downloadError) {
        setError(downloadError instanceof Error ? downloadError.message : "Image download failed");
      }
    });
  }

  async function runPrimaryAction(type: "approve" | "publish" | "images") {
    if (!job) return;
    startTransition(async () => {
      setPendingAction(type === "approve" ? "approve" : type === "publish" ? "publish" : "generate-images");
      setStatusMessage(
        type === "approve" ? "Approving article" : type === "publish" ? "Queueing publish" : "Queueing image generation"
      );
      setError("");
      try {
        if (type === "approve") {
          await postJob(`/api/jobs/${job.id}/approve`, undefined, "Article approved", "article");
        } else if (type === "images") {
          await postJob(
            `/api/jobs/${job.id}/images`,
            { generationSettings: getGenerationSettings() },
            "Images ready",
            "images"
          );
        } else {
          if (editableImages.length > 0) {
            await postJob(
              `/api/jobs/${job.id}/images`,
              {
                images: editableImages
              },
              "Image edits saved",
              "images"
            );
          }
          await postJob(`/api/jobs/${job.id}/automation/publish`, undefined, "Publish queued", tab);
        }
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Action failed");
      } finally {
        setPendingAction("");
      }
    });
  }

  async function downloadDeliverable(format: "markdown" | "json") {
    if (!job) return;

    try {
      setStatusMessage(`Preparing ${format.toUpperCase()} export...`);
      setError("");
      const fallbackName = `${job.brief.slug || job.id}.${format === "markdown" ? "md" : "json"}`;
      await downloadFile(`/api/jobs/${job.id}/deliverable?format=${format}`, fallbackName);
      setStatusMessage(`${format.toUpperCase()} export ready`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Export failed.");
      setStatusMessage("Export failed");
    }
  }

  async function downloadResearchReport(format: "doc" | "html") {
    if (!job) return;

    try {
      setStatusMessage(`Preparing research ${format.toUpperCase()}...`);
      setError("");
      const fallbackName = `${job.brief.slug || job.id}-research-report.${format}`;
      await downloadFile(`/api/jobs/${job.id}/research-report?format=${format}`, fallbackName);
      setStatusMessage(`Research ${format.toUpperCase()} ready`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Research export failed.");
      setStatusMessage("Research export failed");
    }
  }

  const projectCount = new Set(jobs.map((item) => item.client)).size;
  const systemState = error ? "Issue detected" : statusMessage;
  const compactProjects = jobs.slice(0, 2);
  const queueEvents = [...(job?.automationEvents ?? [])].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
  const queueCount = queueEvents.filter((event) => event.status === "queued" || event.status === "running").length;
  const activeEvent =
    queueEvents.find((event) => event.status === "running") ??
    queueEvents.find((event) => event.status === "queued");
  const floatingStatusTitle = pendingAction
    ? statusMessage
    : activeEvent
      ? `${automationTypeLabels[activeEvent.type]} ${automationLabels[activeEvent.status]}`
      : "";
  const floatingStatusDetail = pendingAction
    ? "Still working in the background. You can keep scrolling and reviewing the page."
    : activeEvent?.message || "";
  const liveEvent = queueEvents.find((event) => event.status === "queued" || event.status === "running") ?? null;
  const hasImages = articleImages.length > 0;
  const safeJob = job;
  const workflowSteps: Array<{
    id: WorkspaceTab;
    index: string;
    title: string;
    detail: string;
    state: WorkflowStepState;
  }> = safeJob
    ? [
        {
          id: "expand",
          index: "01",
          title: inKeywordVariantPhase ? "Choose keyword" : "Choose topic",
          detail: inKeywordVariantPhase
            ? `${safeJob.ideas.length} keyword variants ready`
            : `${safeJob.ideas.length} article topics ready`,
          state: "complete"
        },
        {
          id: "research",
          index: "02",
          title: "Research summary",
          detail: hasResearch
            ? `${safeJob.research.sources.length} sources collected`
            : hasSelectedIdea
              ? "Ready to run research"
              : inKeywordVariantPhase
                ? "Select one keyword first"
                : "Select one article topic first",
          state: hasResearch ? "complete" : hasSelectedIdea ? "active" : "locked"
        },
        {
          id: "article",
          index: "03",
          title: "Article studio",
          detail: hasDraft ? `${safeJob.draft.sections.length} sections ready` : hasResearch ? "Ready to create article" : "Research required first",
          state: hasDraft ? "complete" : hasResearch ? "active" : "locked"
        },
        {
          id: "images",
          index: "04",
          title: "Images & publish",
          detail: hasImages ? `${articleImages.length} visuals ready` : hasDraft ? "Ready to generate images" : "Article required first",
          state: safeJob.stage === "published" || hasImages ? "complete" : hasDraft ? "active" : "locked"
        }
      ]
    : [];
  const activeWorkflowStep = workflowSteps.find((step) => step.state === "active") ?? workflowSteps[workflowSteps.length - 1];
  const primaryActionConfig = (() => {
    if (!safeJob) {
      return {
        title: "Create your first project",
        detail: "Start with one project and a seed keyword, then the workflow will guide the rest.",
        cta: "Create Project",
        disabled: false,
        onClick: () => document.getElementById("projects-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
      };
    }

    if (!hasSelectedIdea) {
      return {
        title: inKeywordVariantPhase ? "Choose one keyword variant first" : "Choose one article topic next",
        detail: inKeywordVariantPhase
          ? "Start with a direct keyword from DataForSEO, then the system will expand it into article topics for the next choice."
          : "The keyword is locked inแล้ว ขั้นถัดไปคือเลือกหัวข้อบทความจาก keyword ที่เลือกไว้ก่อนเริ่ม research.",
        cta: inKeywordVariantPhase ? "Review keyword variants" : "Review article topics",
        disabled: false,
        onClick: () => setTab("expand")
      };
    }

    if (!hasResearch) {
      return {
        title: "Run research on the selected keyword",
        detail: "Collect Thai and global sources first, then synthesize them into a readable summary.",
        cta: pendingAction === "run-research" ? "Running Research..." : "Run Research",
        disabled: Boolean(pendingAction),
        onClick: () => void runResearch()
      };
    }

    if (!hasDraft) {
      return {
        title: "Generate the first article draft",
        detail: "Use the research summary, SEO brief, and outline to create the main article.",
        cta: pendingAction === "create-article" ? "Creating Article..." : "Create Article",
        disabled: Boolean(pendingAction),
        onClick: () => void createArticle()
      };
    }

    if (!hasImages) {
      return {
        title: "Create visual assets for the article",
        detail: "Generate a featured image and inline visuals that fit each section of the article.",
        cta: pendingAction === "generate-images" ? "Generating Images..." : "Generate Images",
        disabled: Boolean(pendingAction),
        onClick: () => void runPrimaryAction("images")
      };
    }

    if (job.stage !== "approved" && job.stage !== "published") {
      return {
        title: "Approve the article before publishing",
        detail: "Lock the draft as client-ready, then send it to the publish queue.",
        cta: pendingAction === "approve" ? "Approving..." : "Approve Draft",
        disabled: Boolean(pendingAction),
        onClick: () => void runPrimaryAction("approve")
      };
    }

    if (job.stage !== "published") {
      return {
        title: "Send the article to publish",
        detail: "Push the approved article into WordPress and the connected automation flow.",
        cta: pendingAction === "publish" ? "Queueing Publish..." : "Queue Publish",
        disabled: Boolean(pendingAction),
        onClick: () => void runPrimaryAction("publish")
      };
    }

    return {
      title: "Article already published",
        detail: "Open the queue or published views if you want to review the latest delivery details.",
        cta: "Review Publish Logs",
        disabled: false,
        onClick: () => setTab("queue")
    };
  })();

  return (
    <main className={styles.page}>
      {floatingStatusTitle ? (
        <div className={styles.floatingStatus}>
          <span className={styles.floatingDot} aria-hidden="true" />
          <div>
            <strong>{floatingStatusTitle}</strong>
            <span>{floatingStatusDetail || "Please wait while the current step finishes."}</span>
          </div>
        </div>
      ) : null}
      <section className={`${styles.shell} ${pagePresentation.shellClassName}`}>
        <ConsoleNav />

        <section className={`${styles.hero} ${pagePresentation.heroClassName}`}>
          <div className={styles.heroGlow} />
          <div className={styles.heroAmbient} />
          <div className={styles.heroContent}>
            <span className={styles.kicker}>{pagePresentation.kicker}</span>
            <h1 className={styles.title}>{pagePresentation.title}</h1>
            <p className={styles.heroText}>
              {pagePresentation.description}
            </p>
            <div className={styles.heroActions}>
              <button
                className={styles.primaryButton}
                onClick={() => document.getElementById("projects-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                type="button"
              >
                {pagePresentation.primaryCta}
              </button>
              <button
                className={styles.ghostButton}
                onClick={() => {
                  setTab("expand");
                  document.getElementById("workspace-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                type="button"
              >
                {pagePresentation.secondaryCta}
              </button>
            </div>
          </div>

          <div className={styles.compactRail}>
            <article className={styles.compactCard}>
              <span className={styles.label}>Projects</span>
              <strong>{projectCount}</strong>
            </article>
            <article className={styles.compactCard}>
              <span className={styles.label}>System</span>
              <strong>{systemState}</strong>
            </article>
            <article className={styles.compactCard}>
              <span className={styles.label}>Latest</span>
              <div className={styles.compactProjects}>
                {compactProjects.map((item) => (
                  <span key={item.id}>{getProjectName(item.client)}</span>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section id="projects-section" className={styles.workflowFrame}>
          <ProjectCreateForm
            createProject={createProject as any}
            currentUser={currentUser}
            selectedClientId={selectedClientId}
            setSelectedClientId={setSelectedClientId}
            availableClientAccounts={availableClientAccounts}
            selectedClientAccount={selectedClientAccount}
            seedKeyword={seedKeyword}
            setSeedKeyword={setSeedKeyword}
            isPending={isPending}
            statusMessage={statusMessage}
          />

          <SettingsPanel
            tone={tone}
            setTone={setTone}
            bannedWords={bannedWords}
            setBannedWords={setBannedWords}
            articleLength={articleLength}
            setArticleLength={setArticleLength}
            imageCount={imageCount}
            setImageCount={setImageCount}
          />
        </section>

        {loadState === "loading" ? (
          <section className={`${styles.panel} ${styles.loadingPanel}`}>
            <div className={styles.loadingBars}>
              <span className={styles.skeletonLine} />
              <span className={styles.skeletonLineWide} />
              <span className={styles.skeletonCardLine} />
            </div>
            <p className={styles.loadingText}>Loading projects, keywords, and queue state...</p>
          </section>
        ) : null}

        {loadState === "error" ? (
          <section className={`${styles.panel} ${styles.emptyState}`}>
            <div>
              <h2>Load failed</h2>
              <p>{error}</p>
            </div>
            <button className={styles.primaryButton} onClick={() => void loadJobs()} type="button">
              Retry
            </button>
          </section>
        ) : null}

        {loadState === "empty" ? (
          <section className={`${styles.panel} ${styles.emptyState}`}>
            <div>
              <h2>No project yet</h2>
              <p>เริ่มจากใส่ seed keyword แล้วระบบจะขยาย keyword opportunities ให้ก่อนเลือกไปรีเสิร์ชต่อ</p>
            </div>
          </section>
        ) : null}

        {job && loadState === "ready" ? (
          <section id="workspace-section" className={styles.workspace}>
            <aside className={styles.sidebar}>
              <div className={styles.panel}>
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.label}>Flow</span>
                    <h2>{getProjectName(job.client)}</h2>
                  </div>
                  <span className={styles.keywordChip}>{job.seedKeyword}</span>
                </div>
                <div className={styles.stepStack}>
                  <div className={`${styles.stepRow} ${styles.stepRowComplete}`}>
                    <span>00</span>
                    <strong>Seed keyword</strong>
                    <small>{job.seedKeyword}</small>
                  </div>
                  {workflowSteps.map((step) => (
                    <button
                      key={step.id}
                      className={`${styles.stepRow} ${
                        step.state === "complete"
                          ? styles.stepRowComplete
                          : step.state === "active"
                            ? styles.stepRowActive
                            : styles.stepRowLocked
                      }`}
                      onClick={() => setTab(step.id)}
                      type="button"
                    >
                      <span>{step.index}</span>
                      <strong>{step.title}</strong>
                      <small>{step.detail}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.label}>Panels</span>
                    <h2>Move</h2>
                  </div>
                </div>
                <div className={styles.tabColumn}>
                  <button className={`${styles.navTab} ${tab === "expand" ? styles.navTabActive : ""}`} onClick={() => setTab("expand")} type="button">Keywords</button>
                  <button className={`${styles.navTab} ${tab === "research" ? styles.navTabActive : ""}`} onClick={() => setTab("research")} type="button">Research</button>
                  <button className={`${styles.navTab} ${tab === "queue" ? styles.navTabActive : ""}`} onClick={() => setTab("queue")} type="button">Queue</button>
                  <button className={`${styles.navTab} ${tab === "article" ? styles.navTabActive : ""}`} onClick={() => setTab("article")} type="button">Draft</button>
                  <button className={`${styles.navTab} ${tab === "images" ? styles.navTabActive : ""}`} onClick={() => setTab("images")} type="button">Images</button>
                </div>
              </div>
            </aside>

            <section className={styles.content}>
              <section className={`${styles.panel} ${styles.focusPanel}`}>
                <div className={styles.focusCopy}>
                  <span className={styles.label}>Now</span>
                  <h2>{primaryActionConfig.title}</h2>
                  <p className={styles.focusText}>{primaryActionConfig.detail}</p>
                  <div className={styles.focusMeta}>
                    <span className={styles.focusPill}>Current stage: {stageLabels[job.stage]}</span>
                    <span className={styles.focusPill}>
                      Working keyword: {selectedKeywordLabel || "Waiting for selection"}
                    </span>
                    <span className={styles.focusPill}>
                      Selected topic: {selectedTopicLabel || "Waiting for topic selection"}
                    </span>
                    <span className={styles.focusPill}>Primary workspace: {activeWorkflowStep.title}</span>
                    {editorialPattern ? (
                      <span className={styles.focusPill}>Editorial pattern: {editorialPattern.label}</span>
                    ) : null}
                  </div>
                </div>
                <div className={styles.focusActions}>
                  <button
                    className={styles.primaryButton}
                    disabled={primaryActionConfig.disabled}
                    onClick={primaryActionConfig.onClick}
                    type="button"
                  >
                    {primaryActionConfig.cta}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => setTab(activeWorkflowStep.id)}
                    type="button"
                  >
                    Open {activeWorkflowStep.title}
                  </button>
                </div>
              </section>

              {tab === "expand" ? (
                <KeywordExpansionTab
                  inKeywordVariantPhase={inKeywordVariantPhase}
                  job={job}
                  activeIdea={activeIdea ?? null}
                  pendingAction={pendingAction}
                  selectKeyword={selectKeyword}
                  saveSelectedKeyword={saveSelectedKeyword}
                  selectedIdeaTitle={selectedIdeaTitle}
                  setSelectedIdeaTitle={setSelectedIdeaTitle}
                  selectedIdeaAngle={selectedIdeaAngle}
                  setSelectedIdeaAngle={setSelectedIdeaAngle}
                />
              ) : null}

              {tab === "research" ? (
                <ResearchTab
                  job={job}
                  activeIdea={activeIdea ?? null}
                  hasSelectedIdea={hasSelectedIdea}
                  pendingAction={pendingAction}
                  runResearch={runResearch as any}
                  hasResearch={hasResearch}
                  createArticle={createArticle as any}
                  downloadResearchReport={downloadResearchReport}
                  selectedKeywordLabel={selectedKeywordLabel}
                  researchSummary={researchSummary}
                />
              ) : null}

              {tab === "queue" ? (
                <QueueTab
                  queueCount={queueCount}
                  queueEvents={queueEvents}
                  automationLabels={automationLabels}
                  downloadDeliverable={downloadDeliverable}
                />
              ) : null}

              {tab === "article" ? (
                <ArticleStudioTab
                  job={job as any}
                  activeIdea={activeIdea ?? null}
                  pendingAction={pendingAction}
                  hasDraft={hasDraft}
                  hasResearch={hasResearch}
                  briefTitle={briefTitle}
                  setBriefTitle={setBriefTitle}
                  briefMetaTitle={briefMetaTitle}
                  setBriefMetaTitle={setBriefMetaTitle}
                  briefMetaDescription={briefMetaDescription}
                  setBriefMetaDescription={setBriefMetaDescription}
                  briefSlug={briefSlug}
                  setBriefSlug={setBriefSlug}
                  briefFeaturedImageUrl={briefFeaturedImageUrl}
                  setBriefFeaturedImageUrl={setBriefFeaturedImageUrl}
                  draftIntro={draftIntro}
                  setDraftIntro={setDraftIntro}
                  draftConclusion={draftConclusion}
                  setDraftConclusion={setDraftConclusion}
                  draftSections={draftSections}
                  updateDraftSection={updateDraftSection}
                  articleSections={articleSections as any}
                  articleImages={articleImages}
                  saveDraft={saveDraft as any}
                  regenerateArticleWithAnotherPattern={regenerateArticleWithAnotherPattern as any}
                  featuredImageSrc={featuredImageSrc as any}
                  selectedKeywordLabel={selectedKeywordLabel}
                  imageCount={imageCount}
                  articleLength={articleLength}
                  stageLabels={stageLabels}
                />
              ) : null}

              {tab === "images" ? (
                <ArticleImagesTab
                  hasDraft={hasDraft}
                  pendingAction={pendingAction}
                  runPrimaryAction={runPrimaryAction as any}
                  saveImages={saveImages as any}
                  refreshActiveJob={refreshActiveJob as any}
                  articleImages={articleImages}
                  imageStatusLabel={imageStatusLabel}
                  imageErrorCount={imageErrorCount}
                  updateImageAsset={updateImageAsset}
                  inferImageTextMode={(image) => inferArticleImageTextMode(image.prompt)}
                  inferImageOverlayText={(image) => inferArticleImageOverlayText(image.prompt)}
                  applyImageTextMode={applyImageTextMode}
                  applyImageOverlayText={applyImageOverlayText}
                  suggestImageCopy={suggestImageCopy as any}
                  replaceImageFromFile={replaceImageFromFile as any}
                  downloadImageAsset={downloadImageAsset as any}
                  removeImageAsset={removeImageAsset}
                  restoreImageAsset={restoreImageAsset}
                  regenerateSingleImage={regenerateSingleImage as any}
                />
              ) : null}
            </section>
          </section>
        ) : null}
      </section>
    </main>
  );
}
