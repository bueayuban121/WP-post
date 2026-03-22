"use client";

import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import type { ArticleDraft, ContentBrief, TopicIdea, WorkflowAutomationEvent, WorkflowJob } from "@/types/workflow";
import { ConsoleNav } from "@/components/console-nav";
import { buildLongResearchSummary } from "@/lib/research-copy";
import styles from "./workflow-dashboard.module.css";

type WorkspaceTab = "expand" | "research" | "queue" | "article" | "images";
type LoadState = "loading" | "ready" | "empty" | "error";
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
      replaceJob(nextJob, `${type} workflow running`, type === "research" ? "research" : "article");
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
    type: "research" | "brief" | "draft" | "publish",
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
      try {
        await postJob(
          "/api/jobs",
          { client: projectName, seedKeyword },
          `Created project for ${getProjectName(projectName)}`,
          "expand"
        );
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "Create failed");
      }
    });
  }

  async function selectKeyword(idea: TopicIdea) {
    if (!job) return;
    startTransition(async () => {
      try {
        await postJob(
          `/api/jobs/${job.id}/ideas/select`,
          { ideaId: idea.id },
          `Selected keyword: ${idea.title}`,
          "research"
        );
      } catch (selectError) {
        setError(selectError instanceof Error ? selectError.message : "Select failed");
      }
    });
  }

  async function runResearch() {
    if (!job) return;
    startTransition(async () => {
      try {
        await queueAutomation("research", "Research queued in n8n", "Research summary ready", "research");
      } catch (researchError) {
        setError(researchError instanceof Error ? researchError.message : "Research failed");
      }
    });
  }

  async function createArticle() {
    if (!job) return;
    startTransition(async () => {
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
      try {
        await postJob(`/api/jobs/${job.id}/brief`, brief, "Brief saved", "article");
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Save failed");
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
      try {
        await postJob(`/api/jobs/${job.id}/draft`, draft, "Draft saved", "article");
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Save failed");
      }
    });
  }

  async function runPrimaryAction(type: "approve" | "publish" | "images") {
    if (!job) return;
    const path =
      type === "approve"
        ? `/api/jobs/${job.id}/approve`
        : type === "publish"
          ? `/api/jobs/${job.id}/automation/publish`
          : `/api/jobs/${job.id}/images`;

    const message =
      type === "approve" ? "Article approved" : type === "publish" ? "Publish queued" : "AI image set refreshed";

    startTransition(async () => {
      try {
        await postJob(path, undefined, message, type === "images" ? "images" : tab);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Action failed");
      }
    });
  }

  function downloadDeliverable(format: "markdown" | "json") {
    if (!job) return;
    window.open(`/api/jobs/${job.id}/deliverable?format=${format}`, "_blank", "noopener,noreferrer");
  }

  const projectCount = new Set(jobs.map((item) => item.client)).size;
  const systemState = error ? "Issue detected" : statusMessage;
  const compactProjects = jobs.slice(0, 2);
  const queueEvents = [...(job?.automationEvents ?? [])].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
  const queueCount = queueEvents.filter((event) => event.status === "queued" || event.status === "running").length;

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
                  <div className={styles.stepRow}><span>01</span><strong>Seed keyword</strong><small>{job.seedKeyword}</small></div>
                  <div className={styles.stepRow}><span>02</span><strong>Expand keywords</strong><small>{job.ideas.length} AI opportunities</small></div>
                  <div className={styles.stepRow}><span>03</span><strong>Research summary</strong><small>{hasResearch ? `${job.research.sources.length} sources collected` : "Waiting for research"}</small></div>
                  <div className={styles.stepRow}><span>04</span><strong>Article workflow</strong><small>{hasResearch ? stageLabels[job.stage] : "Research required first"}</small></div>
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
                  <button className={styles.secondaryButton} disabled={!hasSelectedIdea} onClick={() => void runResearch()} type="button">Run Research</button>
                  <button className={styles.secondaryButton} disabled={!hasResearch} onClick={() => void createArticle()} type="button">Create Article</button>
                  <button className={styles.secondaryButton} onClick={() => void runPrimaryAction("images")} type="button">Refresh Images</button>
                  <button className={styles.secondaryButton} onClick={() => void runPrimaryAction("approve")} type="button">Approve</button>
                  <button className={styles.primaryButton} onClick={() => void runPrimaryAction("publish")} type="button">Queue Publish</button>
                </div>
                <div className={styles.exportRow}>
                  <button className={styles.ghostButton} onClick={() => downloadDeliverable("markdown")} type="button">Export MD</button>
                  <button className={styles.ghostButton} onClick={() => downloadDeliverable("json")} type="button">Export JSON</button>
                </div>
              </div>
            </aside>

            <section className={styles.content}>
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
                        <button className={styles.primaryButton} onClick={() => void selectKeyword(idea)} type="button">
                          Select keyword
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
                      <button className={styles.secondaryButton} disabled={!hasSelectedIdea} onClick={() => void runResearch()} type="button">Run Research</button>
                      <button className={styles.primaryButton} disabled={!hasResearch} onClick={() => void createArticle()} type="button">Create Article</button>
                    </div>
                  </div>
                  <div className={styles.researchLayout}>
                    <article className={styles.researchMain}>
                      <h3>{activeIdea?.title ?? "Select a keyword first"}</h3>
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
                      <button className={styles.primaryButton} onClick={() => void saveBrief()} type="button">Save Brief</button>
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
                      <button className={styles.secondaryButton} onClick={() => void saveDraft()} type="button">Save Draft</button>
                    </div>
                  </section>

                  <article className={`${styles.articleLayout} ${styles.articlePreview}`}>
                    <div className={styles.heroImage}>
                      <Image alt={articleImages[0]?.alt ?? "Featured article image"} height={900} src={featuredImageSrc} width={1600} />
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
                                  <Image alt={image.alt} height={760} src={image.src} width={1320} />
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
                    <button className={styles.primaryButton} onClick={() => void runPrimaryAction("images")} type="button">Refresh Images</button>
                  </div>
                  <div className={styles.imageShowcase}>
                    {articleImages.map((image) => (
                      <article key={image.id} className={styles.imageCard}>
                        <div className={styles.imageThumbLarge}>
                          <Image alt={image.alt} height={840} src={image.src} width={1400} />
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
