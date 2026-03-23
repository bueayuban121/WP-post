"use client";

import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import type { ArticleDraft, ContentBrief, TopicIdea, WorkflowAutomationEvent, WorkflowJob } from "@/types/workflow";
import { ConsoleNav } from "@/components/console-nav";
import { buildLongResearchSummary } from "@/lib/research-copy";
import styles from "./workflow-dashboard.module.css";

type WorkspaceTab = "expand" | "research" | "queue" | "article" | "images";
type LoadState = "loading" | "ready" | "empty" | "error";
type WorkflowStepState = "complete" | "active" | "locked";
type PendingAction =
  | ""
  | "create-project"
  | "select-keyword"
  | "run-research"
  | "create-article"
  | "save-brief"
  | "save-draft"
  | "generate-images"
  | "approve"
  | "publish";
const settingsStorageKey = "auto-post-content-settings";

const stageLabels = {
  idea_pool: "Keyword Expansion",
  selected: "Keyword Selected",
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
  initialJobId = ""
}: {
  initialTab?: WorkspaceTab;
  initialJobId?: string;
}) {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [activeJobId, setActiveJobId] = useState("");
  const [projectName, setProjectName] = useState("AquaCare Thailand");
  const [seedKeyword, setSeedKeyword] = useState("ปลาทอง");
  const [tone, setTone] = useState("Calm expert");
  const [bannedWords, setBannedWords] = useState("ดีที่สุด, การันตี, รักษาหาย");
  const [articleLength, setArticleLength] = useState("1800");
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

  const job = jobs.find((item) => item.id === activeJobId) ?? jobs[0] ?? null;
  const activeIdea = job?.ideas.find((idea) => idea.id === job.selectedIdeaId) ?? null;
  const articleImages = job?.images ?? [];
  const featuredImageSrc =
    briefFeaturedImageUrl.trim() || articleImages[0]?.src || "/article-images/goldfish-water-1.svg";
  const researchSummary = buildResearchSummary(job?.seedKeyword ?? "", activeIdea, job);
  const hasSelectedIdea = Boolean(activeIdea);
  const hasResearch = Boolean(job?.research.sources.length);
  const hasDraft = Boolean(job?.draft.sections.length);
  const imageEvent = job ? getLatestEvent(job, "images") : undefined;
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
  const imageStatusDetail =
    typeof imageEvent?.payload?.provider === "string" ? imageEvent.payload.provider : "";
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
    } catch {
      window.localStorage.removeItem(settingsStorageKey);
    }
  }, []);

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
        await postJob(
          "/api/jobs",
          { client: projectName, seedKeyword },
          `Created project for ${getProjectName(projectName)}`,
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
      setStatusMessage("Selecting keyword");
      setError("");
      try {
        await postJob(
          `/api/jobs/${job.id}/ideas/select`,
          { ideaId: idea.id },
          `Selected keyword: ${idea.title}`,
          "research"
        );
      } catch (selectError) {
        setError(selectError instanceof Error ? selectError.message : "Select failed");
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
        const briefJob = await queueAutomation("brief", "Brief queued in n8n", "Brief ready", "article");
        if (!briefJob) {
          throw new Error("Brief generation failed.");
        }

        const draftJob = await queueAutomation("draft", "Draft queued in n8n", "Article generated", "article");
        if (!draftJob) {
          throw new Error("Draft generation failed.");
        }
      } catch (draftError) {
        setError(draftError instanceof Error ? draftError.message : "Draft failed");
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
      conclusion: draftConclusion
    };

    startTransition(async () => {
      setPendingAction("save-draft");
      setStatusMessage("Saving draft");
      setError("");
      try {
        await postJob(`/api/jobs/${job.id}/draft`, draft, "Draft saved", "article");
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Save failed");
      } finally {
        setPendingAction("");
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
          await queueAutomation("images", "Image generation queued", "Images ready", "images");
        } else {
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
  const liveEvent = queueEvents.find((event) => event.status === "queued" || event.status === "running") ?? null;
  const hasImages = articleImages.length > 0;
  const workflowSteps: Array<{
    id: WorkspaceTab;
    index: string;
    title: string;
    detail: string;
    state: WorkflowStepState;
  }> = [
    {
      id: "expand",
      index: "01",
      title: "Expand keywords",
      detail: `${job.ideas.length} AI opportunities`,
      state: "complete"
    },
    {
      id: "research",
      index: "02",
      title: "Research summary",
      detail: hasResearch ? `${job.research.sources.length} sources collected` : hasSelectedIdea ? "Ready to run research" : "Select one keyword first",
      state: hasResearch ? "complete" : hasSelectedIdea ? "active" : "locked"
    },
    {
      id: "article",
      index: "03",
      title: "Article studio",
      detail: hasDraft ? `${job.draft.sections.length} sections ready` : hasResearch ? "Ready to create article" : "Research required first",
      state: hasDraft ? "complete" : hasResearch ? "active" : "locked"
    },
    {
      id: "images",
      index: "04",
      title: "Images & publish",
      detail: hasImages ? `${articleImages.length} visuals ready` : hasDraft ? "Ready to generate images" : "Article required first",
      state: job.stage === "published" || hasImages ? "complete" : hasDraft ? "active" : "locked"
    }
  ];
  const activeWorkflowStep = workflowSteps.find((step) => step.state === "active") ?? workflowSteps[workflowSteps.length - 1];
  const primaryActionConfig = (() => {
    if (!hasSelectedIdea) {
      return {
        title: "Choose one keyword opportunity",
        detail: "Start by selecting a single topic before the system moves into research.",
        cta: "Review keyword options",
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
      <section className={styles.shell}>
        <ConsoleNav />

        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroAmbient} />
          <div className={styles.heroContent}>
            <span className={styles.kicker}>FUTURE SEO SYSTEM</span>
            <h1 className={styles.title}>Turn one keyword into a research-backed article, then ship it to WordPress.</h1>
            <p className={styles.heroText}>
              รับ keyword, ขยายเป็น 10-15 keyword opportunities, เลือกคำที่ต้องการ, รีเสิร์ชรวมข้อมูลให้เป็นภาษาไทย, แล้วค่อยสร้างบทความพร้อมภาพและ publish flow ในระบบเดียว
            </p>
            <div className={styles.heroActions}>
              <button
                className={styles.primaryButton}
                onClick={() => document.getElementById("projects-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                type="button"
              >
                Create Project
              </button>
              <button
                className={styles.ghostButton}
                onClick={() => {
                  setTab("expand");
                  document.getElementById("workspace-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                type="button"
              >
                Open Workflow
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
          <section className={styles.panel}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.label}>Step 1</span>
                <h2>Create Project</h2>
              </div>
              <span className={styles.statusChip}>{statusMessage}</span>
            </div>

            <form className={styles.createForm} onSubmit={createProject}>
              <label>
                Project name
                <small>ชื่อโปรเจกต์หรือเว็บไซต์ปลายทาง</small>
                <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
              </label>
              <label>
                Seed keyword
                <small>คีย์เวิร์ดตั้งต้นที่ใช้แตกคำ</small>
                <input value={seedKeyword} onChange={(event) => setSeedKeyword(event.target.value)} />
              </label>
              <button className={styles.primaryButton} disabled={isPending} type="submit">
                {isPending ? "Creating..." : "Create Project"}
              </button>
            </form>
          </section>

          <section id="settings-section" className={styles.panel}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.label}>Core Settings</span>
                <h2>Content Defaults</h2>
              </div>
            </div>
            <div className={styles.settingsForm}>
              <label>
                Tone
                <small>โทนหลักของบทความ</small>
                <input value={tone} onChange={(event) => setTone(event.target.value)} />
              </label>
              <label>
                Restricted words
                <small>คำต้องห้ามหรือคำที่ไม่ต้องการให้ใช้</small>
                <input value={bannedWords} onChange={(event) => setBannedWords(event.target.value)} />
              </label>
              <label>
                Target length
                <small>จำนวนคำเป้าหมายของบทความ</small>
                <input value={articleLength} onChange={(event) => setArticleLength(event.target.value)} />
              </label>
            </div>
          </section>
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
                    <span className={styles.label}>Workflow</span>
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
                    <span className={styles.label}>Workspace</span>
                    <h2>Navigate</h2>
                  </div>
                </div>
                <div className={styles.tabColumn}>
                  <button className={`${styles.navTab} ${tab === "expand" ? styles.navTabActive : ""}`} onClick={() => setTab("expand")} type="button">Keyword Expansion</button>
                  <button className={`${styles.navTab} ${tab === "research" ? styles.navTabActive : ""}`} onClick={() => setTab("research")} type="button">Research Summary</button>
                  <button className={`${styles.navTab} ${tab === "queue" ? styles.navTabActive : ""}`} onClick={() => setTab("queue")} type="button">Queue & Logs</button>
                  <button className={`${styles.navTab} ${tab === "article" ? styles.navTabActive : ""}`} onClick={() => setTab("article")} type="button">Article Studio</button>
                  <button className={`${styles.navTab} ${tab === "images" ? styles.navTabActive : ""}`} onClick={() => setTab("images")} type="button">Article Images</button>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.label}>Queue</span>
                    <h2>Primary Actions</h2>
                  </div>
                  <span className={styles.statusChipMuted}>{queueCount} active</span>
                </div>
                <div className={styles.actionGrid}>
                  <button
                    className={styles.secondaryButton}
                    disabled={!hasSelectedIdea || Boolean(pendingAction)}
                    onClick={() => void runResearch()}
                    type="button"
                  >
                    {pendingAction === "run-research" ? "Running Research..." : "Run Research"}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    disabled={!hasResearch || Boolean(pendingAction)}
                    onClick={() => void createArticle()}
                    type="button"
                  >
                    {pendingAction === "create-article" ? "Creating Article..." : "Create Article"}
                  </button>
                    <button
                      className={styles.secondaryButton}
                      disabled={!hasDraft || Boolean(pendingAction)}
                      onClick={() => void runPrimaryAction("images")}
                      type="button"
                    >
                      {pendingAction === "generate-images" ? "Generating Images..." : "Generate Images"}
                    </button>
                  <button
                    className={styles.secondaryButton}
                    disabled={Boolean(pendingAction)}
                    onClick={() => void runPrimaryAction("approve")}
                    type="button"
                  >
                    {pendingAction === "approve" ? "Approving..." : "Approve"}
                  </button>
                  <button
                    className={styles.primaryButton}
                    disabled={Boolean(pendingAction)}
                    onClick={() => void runPrimaryAction("publish")}
                    type="button"
                  >
                    {pendingAction === "publish" ? "Queueing Publish..." : "Queue Publish"}
                  </button>
                </div>
                <div className={styles.statusRow}>
                  <span className={styles.statusChipMuted}>
                    {pendingAction ? statusMessage : liveEvent ? `${liveEvent.type} ${automationLabels[liveEvent.status]}` : statusMessage}
                  </span>
                </div>
                <div className={styles.exportRow}>
                  <button className={styles.ghostButton} onClick={() => downloadDeliverable("markdown")} type="button">Export MD</button>
                  <button className={styles.ghostButton} onClick={() => downloadDeliverable("json")} type="button">Export JSON</button>
                  <button className={styles.ghostButton} onClick={() => downloadResearchReport("doc")} type="button">Research DOC</button>
                  <button className={styles.ghostButton} onClick={() => downloadResearchReport("html")} type="button">Research HTML</button>
                </div>
              </div>
            </aside>

            <section className={styles.content}>
              <section className={`${styles.panel} ${styles.focusPanel}`}>
                <div className={styles.focusCopy}>
                  <span className={styles.label}>Next Step</span>
                  <h2>{primaryActionConfig.title}</h2>
                  <p className={styles.focusText}>{primaryActionConfig.detail}</p>
                  <div className={styles.focusMeta}>
                    <span className={styles.focusPill}>Current stage: {stageLabels[job.stage]}</span>
                    <span className={styles.focusPill}>Selected topic: {activeIdea?.title ?? "Waiting for selection"}</span>
                    <span className={styles.focusPill}>Primary workspace: {activeWorkflowStep.title}</span>
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
                <section className={`${styles.panel} ${styles.motionScene}`}>
                  <div className={styles.sectionHead}>
                    <div>
                      <span className={styles.label}>Step 2</span>
                      <h2>AI Keyword Expansion</h2>
                    </div>
                    <span className={styles.statusChip}>{job.ideas.length} keywords</span>
                  </div>
                  <p className={styles.sectionText}>
                    ระบบขยาย seed keyword เป็น keyword opportunities สำหรับเลือกไปรีเสิร์ชต่อ เลือกคำที่ตรงกับสิ่งที่ลูกค้าต้องการที่สุดก่อน แล้วค่อยกด Run Research
                  </p>
                  <div className={styles.sectionLead}>
                    <div className={styles.quickStats}>
                      <div>
                        <span className={styles.label}>Seed</span>
                        <strong>{job.seedKeyword}</strong>
                      </div>
                      <div>
                        <span className={styles.label}>Selected</span>
                        <strong>{activeIdea?.title ?? "Not selected"}</strong>
                      </div>
                      <div>
                        <span className={styles.label}>Intent mix</span>
                        <strong>{job.ideas.map((idea) => idea.searchIntent).filter((value, index, array) => array.indexOf(value) === index).join(" · ")}</strong>
                      </div>
                    </div>
                  </div>
                  <div className={styles.keywordGrid}>
                    {job.ideas.map((idea) => (
                      <article
                        key={idea.id}
                        className={`${styles.keywordCard} ${job.selectedIdeaId === idea.id ? styles.keywordCardActive : ""}`}
                      >
                        <div className={styles.keywordMeta}>
                          <span>{idea.searchIntent}</span>
                          <span>{idea.confidence}%</span>
                        </div>
                        <strong>{idea.title}</strong>
                        <button
                          className={styles.primaryButton}
                          disabled={Boolean(pendingAction)}
                          onClick={() => void selectKeyword(idea)}
                          type="button"
                        >
                          {pendingAction === "select-keyword" && job.selectedIdeaId !== idea.id
                            ? "Selecting..."
                            : job.selectedIdeaId === idea.id
                              ? "Selected"
                              : "Select keyword"}
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {tab === "research" ? (
                <section className={`${styles.panel} ${styles.motionScene}`}>
                  <div className={styles.sectionHead}>
                    <div>
                      <span className={styles.label}>Step 3</span>
                      <h2>Research Summary</h2>
                    </div>
                    <div className={styles.researchActions}>
                      <button
                        className={styles.secondaryButton}
                        disabled={!hasSelectedIdea || Boolean(pendingAction)}
                        onClick={() => void runResearch()}
                        type="button"
                      >
                        {pendingAction === "run-research" ? "Running Research..." : "Run Research"}
                      </button>
                      <button
                        className={styles.primaryButton}
                        disabled={!hasResearch || Boolean(pendingAction)}
                        onClick={() => void createArticle()}
                        type="button"
                      >
                        {pendingAction === "create-article" ? "Creating Article..." : "Create Article"}
                      </button>
                    </div>
                  </div>
                  <div className={styles.researchLayout}>
                    <article className={styles.researchMain}>
                      <h3>{activeIdea?.title ?? "Select a keyword first"}</h3>
                      <div className={styles.researchIntro}>
                        <span className={styles.focusPill}>Sources: {job.research.sources.length}</span>
                        <span className={styles.focusPill}>Gaps: {job.research.gaps.length}</span>
                        <span className={styles.focusPill}>Audience: {job.research.audience || "Waiting for synthesis"}</span>
                      </div>
                      <p className={styles.sectionText}>{researchSummary || "ยังไม่มีข้อมูลรีเสิร์ชในงานนี้"}</p>
                    </article>
                    <aside className={styles.researchSide}>
                      <div className={styles.sourcePanel}>
                        <span className={styles.label}>Sources</span>
                        {job.research.sources.map((source) => (
                          <div key={`${source.region}-${source.title}`} className={styles.sourceItem}>
                            <strong>{source.title}</strong>
                            <p>{source.source}</p>
                            <small>{source.insight}</small>
                          </div>
                        ))}
                      </div>
                      <div className={styles.sourcePanel}>
                        <span className={styles.label}>Research gaps</span>
                        <ul className={styles.simpleList}>
                          {job.research.gaps.map((gap) => (
                            <li key={gap}>{gap}</li>
                          ))}
                        </ul>
                      </div>
                    </aside>
                  </div>
                </section>
              ) : null}

              {tab === "queue" ? (
                <section className={`${styles.panel} ${styles.motionScene}`}>
                  <div className={styles.sectionHead}>
                    <div>
                      <span className={styles.label}>Step 4</span>
                      <h2>Queue & Logs</h2>
                    </div>
                    <span className={styles.statusChip}>{queueCount} active jobs</span>
                  </div>

                  <div className={styles.queueTable}>
                    <div className={styles.queueHead}>
                      <span>Action</span>
                      <span>Status</span>
                      <span>Source</span>
                      <span>Updated</span>
                    </div>
                    {queueEvents.length > 0 ? (
                      queueEvents.map((event) => (
                        <div key={event.id} className={styles.queueRow}>
                          <strong>{event.type}</strong>
                          <span>{automationLabels[event.status]}</span>
                          <span>{event.source.toUpperCase()}</span>
                          <span>{new Date(event.updatedAt).toLocaleString("th-TH")}</span>
                        </div>
                      ))
                    ) : (
                      <div className={styles.eventEmpty}>ยังไม่มี queue event ในโปรเจกต์นี้</div>
                    )}
                  </div>

                  <div className={styles.eventList}>
                    {queueEvents.slice(0, 4).map((event) => (
                      <article key={`${event.id}-log`} className={styles.eventItem}>
                        <div className={styles.eventTop}>
                          <strong>{event.type}</strong>
                          <span className={styles.eventStatus}>{automationLabels[event.status]}</span>
                        </div>
                        <p>{event.message || "ระบบยังไม่มีข้อความอธิบายเพิ่มเติมสำหรับงานนี้"}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {tab === "article" ? (
                <section className={`${styles.articleWorkspace} ${styles.motionScene}`}>
                  <section className={`${styles.panel} ${styles.editorPanel}`}>
                    <div className={styles.sectionHead}>
                      <div>
                        <span className={styles.label}>Step 4</span>
                        <h2>Article Studio</h2>
                      </div>
                      <button
                        className={styles.primaryButton}
                        disabled={Boolean(pendingAction)}
                        onClick={() => void saveBrief()}
                        type="button"
                      >
                        {pendingAction === "save-brief" ? "Saving Brief..." : "Save Brief"}
                      </button>
                    </div>
                    <div className={styles.editorFields}>
                      <label className={styles.editorField}>
                        <span>Title</span>
                        <small>หัวข้อหลักของบทความ</small>
                        <input value={briefTitle} onChange={(event) => setBriefTitle(event.target.value)} />
                      </label>
                      <label className={styles.editorField}>
                        <span>Meta Title</span>
                        <small>ใช้ใน SEO title</small>
                        <input value={briefMetaTitle} onChange={(event) => setBriefMetaTitle(event.target.value)} />
                      </label>
                      <label className={styles.editorField}>
                        <span>Meta Description</span>
                        <small>ข้อความสรุปสำหรับ search</small>
                        <textarea rows={4} value={briefMetaDescription} onChange={(event) => setBriefMetaDescription(event.target.value)} />
                      </label>
                      <label className={styles.editorField}>
                        <span>Slug</span>
                        <small>URL ของโพสต์</small>
                        <input value={briefSlug} onChange={(event) => setBriefSlug(event.target.value)} />
                      </label>
                      <label className={styles.editorField}>
                        <span>Featured Image URL</span>
                        <small>ถ้าไม่ใส่จะใช้รูปแรกจาก AI image set</small>
                        <input value={briefFeaturedImageUrl} onChange={(event) => setBriefFeaturedImageUrl(event.target.value)} />
                      </label>
                      <label className={styles.editorField}>
                        <span>Intro</span>
                        <small>บทนำของบทความ</small>
                        <textarea rows={5} value={draftIntro} onChange={(event) => setDraftIntro(event.target.value)} />
                      </label>
                      <label className={styles.editorField}>
                        <span>Conclusion</span>
                        <small>สรุปท้ายบทความ</small>
                        <textarea rows={5} value={draftConclusion} onChange={(event) => setDraftConclusion(event.target.value)} />
                      </label>
                      <button
                        className={styles.secondaryButton}
                        disabled={Boolean(pendingAction)}
                        onClick={() => void saveDraft()}
                        type="button"
                      >
                        {pendingAction === "save-draft" ? "Saving Draft..." : "Save Draft"}
                      </button>
                    </div>
                  </section>

                  <article className={`${styles.articleLayout} ${styles.articlePreview}`}>
                    <div className={styles.heroImage}>
                      <Image alt={articleImages[0]?.alt ?? "Featured article image"} height={900} src={featuredImageSrc} unoptimized width={1600} />
                    </div>
                    <div className={styles.articleMeta}>
                      <span>Keyword: {job.seedKeyword}</span>
                      <span>Status: {stageLabels[job.stage]}</span>
                      <span>Length target: {articleLength} words</span>
                    </div>
                    <div className={styles.articleBody}>
                      <h2 className={styles.previewTitle}>{briefTitle || activeIdea?.title || "Untitled article"}</h2>
                      <p className={styles.previewMeta}>{briefMetaDescription}</p>
                      {splitParagraphs(draftIntro).map((paragraph) => (
                        <p key={`intro-${paragraph.slice(0, 36)}`} className={styles.articleIntro}>
                          {paragraph}
                        </p>
                      ))}
                      {job.draft.sections.map((section, index) => {
                        const image = articleImages[index + 1];
                        return (
                          <section key={section.heading} className={styles.articleSection}>
                            <h3>{section.heading}</h3>
                            {splitParagraphs(section.body).map((paragraph) => (
                              <p key={`${section.heading}-${paragraph.slice(0, 36)}`}>{paragraph}</p>
                            ))}
                            {image ? (
                              <figure className={styles.inlineFigure}>
                                <div className={styles.inlineImage}>
                                  <Image alt={image.alt} height={760} src={image.src} unoptimized width={1320} />
                                </div>
                                <figcaption>
                                  <span>{image.caption}</span>
                                  <small>{image.placement}</small>
                                </figcaption>
                              </figure>
                            ) : null}
                          </section>
                        );
                      })}
                      {splitParagraphs(draftConclusion).map((paragraph) => (
                        <p key={`conclusion-${paragraph.slice(0, 36)}`} className={styles.articleConclusion}>
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </article>
                </section>
              ) : null}

              {tab === "images" ? (
                <section className={`${styles.panel} ${styles.motionScene}`}>
                  <div className={styles.sectionHead}>
                    <div>
                      <span className={styles.label}>Visual Layer</span>
                      <h2>AI Article Images</h2>
                    </div>
                    <span className={styles.statusChipMuted}>
                      {imageStatusLabel}
                      {imageStatusDetail ? ` · ${imageStatusDetail}` : ""}
                      {imageErrorCount > 0 ? ` · ${imageErrorCount} issues` : ""}
                    </span>
                    <button
                      className={styles.primaryButton}
                      disabled={!hasDraft || Boolean(pendingAction)}
                      onClick={() => void runPrimaryAction("images")}
                      type="button"
                    >
                      {pendingAction === "generate-images" ? "Generating Images..." : "Generate Images"}
                    </button>
                  </div>
                  <div className={styles.imageShowcase}>
                    {articleImages.map((image) => (
                      <article key={image.id} className={styles.imageCard}>
                        <div className={styles.imageThumbLarge}>
                            <Image alt={image.alt} height={840} src={image.src} unoptimized width={1400} />
                        </div>
                        <strong>{image.caption}</strong>
                        <p>{image.alt}</p>
                        <span>{image.placement}</span>
                        <code>{image.prompt}</code>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
            </section>
          </section>
        ) : null}
      </section>
    </main>
  );
}
