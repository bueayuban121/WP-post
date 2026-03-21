"use client";

import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import type {
  ArticleDraft,
  ContentBrief,
  WorkflowAutomationEvent,
  WorkflowJob,
  WorkflowStage
} from "@/types/workflow";
import styles from "./workflow-dashboard.module.css";

type ContentView = "article" | "images" | "structure";
type LoadState = "loading" | "ready" | "empty" | "error";

const stageLabels: Record<WorkflowStage, string> = {
  idea_pool: "คลังหัวข้อ",
  selected: "เลือกหัวข้อแล้ว",
  researching: "กำลังรีเสิร์ช",
  brief_ready: "บรีฟพร้อม",
  drafting: "กำลังเขียน",
  review: "รอตรวจ",
  approved: "อนุมัติแล้ว",
  published: "เผยแพร่แล้ว"
};

const automationStatusLabels: Record<WorkflowAutomationEvent["status"], string> = {
  queued: "รอคิว",
  running: "กำลังทำงาน",
  succeeded: "สำเร็จ",
  failed: "ล้มเหลว"
};

function getProjectName(name: string) {
  return name.trim() || "โปรเจกต์ใหม่";
}

function getDurationLabel(event: WorkflowAutomationEvent) {
  const start = new Date(event.createdAt).getTime();
  const end = new Date(event.updatedAt).getTime();
  const diffMs = Math.max(end - start, 0);
  const seconds = Math.round(diffMs / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${minutes}m ${remain}s`;
}

async function parseJsonResponse(response: Response) {
  const data = (await response.json()) as {
    error?: string;
    job?: WorkflowJob;
    jobs?: WorkflowJob[];
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data;
}

export function WorkflowDashboard() {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [activeJobId, setActiveJobId] = useState("");
  const [client, setClient] = useState("AquaCare Thailand");
  const [seedKeyword, setSeedKeyword] = useState("ปลาทอง");
  const [contentView, setContentView] = useState<ContentView>("article");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [statusMessage, setStatusMessage] = useState("กำลังโหลดโปรเจกต์");
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
  const activeIdea = job?.ideas.find((idea) => idea.id === job.selectedIdeaId) ?? job?.ideas[0] ?? null;
  const articleImages = job?.images ?? [];
  const featuredImageSrc =
    briefFeaturedImageUrl.trim() || articleImages[0]?.src || "/article-images/goldfish-water-1.svg";

  const projectSummaries = Array.from(
    jobs.reduce((map, item) => {
      const key = item.client;
      const current = map.get(key) ?? { client: item.client, jobs: 0, published: 0 };
      current.jobs += 1;
      if (item.stage === "published") {
        current.published += 1;
      }
      map.set(key, current);
      return map;
    }, new Map<string, { client: string; jobs: number; published: number }>())
  ).map(([, value]) => value);

  const summary = [
    { label: "โปรเจกต์ทั้งหมด", value: projectSummaries.length, hint: "ชุดงานที่เปิดใช้งานอยู่" },
    {
      label: "งานรอสร้าง",
      value: jobs.filter((item) => ["idea_pool", "selected", "researching"].includes(item.stage)).length,
      hint: "ยังไม่ถึงขั้นพร้อมรีวิว"
    },
    {
      label: "งานพร้อมตรวจ",
      value: jobs.filter((item) => ["brief_ready", "drafting", "review", "approved"].includes(item.stage)).length,
      hint: "พร้อมแก้ไขและอนุมัติ"
    },
    {
      label: "เผยแพร่แล้ว",
      value: jobs.filter((item) => item.stage === "published").length,
      hint: "ส่งออกไป WordPress แล้ว"
    },
    {
      label: "งาน error",
      value: jobs.filter((item) => item.automationEvents?.some((event) => event.status === "failed")).length,
      hint: "ต้องย้อนดู log"
    }
  ];

  const recentEvents = (job?.automationEvents ?? [])
    .slice()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  const systemCards = [
    {
      label: "WordPress",
      value: recentEvents.some((event) => event.type === "publish" && event.status === "succeeded")
        ? "พร้อมใช้งาน"
        : "รอทดสอบ",
      tone:
        recentEvents.some((event) => event.type === "publish" && event.status === "succeeded") ? "ready" : "muted"
    },
    {
      label: "Automation",
      value: recentEvents.some((event) => event.status === "running") ? "กำลังประมวลผล" : "พร้อมใช้งาน",
      tone: recentEvents.some((event) => event.status === "running") ? "running" : "ready"
    },
    {
      label: "Prompt",
      value: activeIdea ? "กำลังใช้งาน" : "ยังไม่เลือกหัวข้อ",
      tone: activeIdea ? "ready" : "muted"
    }
  ] as const;

  function hydrateEditorState(targetJob: WorkflowJob) {
    setBriefTitle(targetJob.brief.title);
    setBriefMetaTitle(targetJob.brief.metaTitle);
    setBriefMetaDescription(targetJob.brief.metaDescription);
    setBriefSlug(targetJob.brief.slug);
    setBriefFeaturedImageUrl(targetJob.brief.featuredImageUrl);
    setDraftIntro(targetJob.draft.intro);
    setDraftConclusion(targetJob.draft.conclusion);
  }

  const loadJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const data = await parseJsonResponse(response);
      const nextJobs = data.jobs ?? [];
      const nextActiveJob = nextJobs[0] ?? null;

      setJobs(nextJobs);
      setActiveJobId((current) => current || nextActiveJob?.id || "");
      if (nextActiveJob) {
        hydrateEditorState(nextActiveJob);
      }
      setStatusMessage(nextJobs.length > 0 ? "พร้อมใช้งาน" : "ยังไม่มีข้อมูล");
      setLoadState(nextJobs.length > 0 ? "ready" : "empty");
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ");
      setStatusMessage("โหลดข้อมูลไม่สำเร็จ");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const response = await fetch("/api/jobs", { cache: "no-store" });
        const data = await parseJsonResponse(response);
        if (cancelled) return;

        const nextJobs = data.jobs ?? [];
        const nextActiveJob = nextJobs[0] ?? null;
        setJobs(nextJobs);
        setActiveJobId(nextActiveJob?.id ?? "");
        if (nextActiveJob) {
          hydrateEditorState(nextActiveJob);
        }
        setStatusMessage(nextJobs.length > 0 ? "พร้อมใช้งาน" : "ยังไม่มีข้อมูล");
        setLoadState(nextJobs.length > 0 ? "ready" : "empty");
        setError("");
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ");
        setStatusMessage("โหลดข้อมูลไม่สำเร็จ");
        setLoadState("error");
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function replaceJob(nextJob: WorkflowJob) {
    setJobs((current) =>
      current.some((item) => item.id === nextJob.id)
        ? current.map((item) => (item.id === nextJob.id ? nextJob : item))
        : [nextJob, ...current]
    );
    setActiveJobId(nextJob.id);
    hydrateEditorState(nextJob);
    setLoadState("ready");
    setError("");
  }

  async function runJobAction(path: string, options?: RequestInit, successMessage?: string) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {})
      }
    });
    const data = await parseJsonResponse(response);

    if (!data.job) {
      throw new Error("Job payload missing.");
    }

    replaceJob(data.job);
    setStatusMessage(successMessage ?? "อัปเดตเรียบร้อย");
  }

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await runJobAction(
          "/api/jobs",
          { method: "POST", body: JSON.stringify({ client, seedKeyword }) },
          `สร้างงานใหม่สำหรับ ${getProjectName(client)} แล้ว`
        );
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "Create job failed.");
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
      featuredImageUrl: briefFeaturedImageUrl.trim()
    };

    startTransition(async () => {
      try {
        await runJobAction(
          `/api/jobs/${job.id}/brief`,
          { method: "POST", body: JSON.stringify(brief) },
          "บันทึก SEO brief แล้ว"
        );
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Save brief failed.");
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
        await runJobAction(
          `/api/jobs/${job.id}/draft`,
          { method: "POST", body: JSON.stringify(draft) },
          "บันทึกบทความแล้ว"
        );
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Save draft failed.");
      }
    });
  }

  async function runAutomation(type: "research" | "brief" | "draft" | "publish", message: string) {
    if (!job) return;

    startTransition(async () => {
      try {
        await runJobAction(`/api/jobs/${job.id}/automation/${type}`, { method: "POST" }, message);
      } catch (automationError) {
        setError(automationError instanceof Error ? automationError.message : "Automation failed.");
      }
    });
  }

  async function selectIdea(ideaId: string, title: string) {
    if (!job) return;

    startTransition(async () => {
      try {
        await runJobAction(
          `/api/jobs/${job.id}/ideas/select`,
          { method: "POST", body: JSON.stringify({ ideaId }) },
          `เลือกหัวข้อ “${title}” แล้ว`
        );
      } catch (selectError) {
        setError(selectError instanceof Error ? selectError.message : "Select idea failed.");
      }
    });
  }

  async function approveCurrentJob() {
    if (!job) return;

    startTransition(async () => {
      try {
        await runJobAction(`/api/jobs/${job.id}/approve`, { method: "POST" }, "อนุมัติบทความแล้ว");
      } catch (approveError) {
        setError(approveError instanceof Error ? approveError.message : "Approve failed.");
      }
    });
  }

  function downloadDeliverable(format: "markdown" | "json") {
    if (!job) return;
    window.open(`/api/jobs/${job.id}/deliverable?format=${format}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <nav className={styles.topNav}>
          <div className={styles.navBrand}>
            <span className={styles.kicker}>Auto Post Content</span>
            <strong>สร้างบทความจากคีย์เวิร์ด และส่งเข้า WordPress อัตโนมัติ</strong>
          </div>
          <div className={styles.navLinks}>
            <button onClick={() => scrollToSection("dashboard")} type="button">
              Dashboard
            </button>
            <button onClick={() => scrollToSection("new-job")} type="button">
              Projects
            </button>
            <button onClick={() => scrollToSection("jobs")} type="button">
              Jobs
            </button>
            <button onClick={() => scrollToSection("workspace")} type="button">
              Article
            </button>
            <button onClick={() => scrollToSection("settings")} type="button">
              Settings
            </button>
          </div>
        </nav>

        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.kicker}>Auto Post Content</span>
            <h1 className={styles.title}>สร้างบทความจากคีย์เวิร์ด และส่งเข้า WordPress อัตโนมัติ</h1>
            <p className={styles.heroText}>
              ใช้สำหรับทีม SEO, content และเจ้าของเว็บที่ต้องการแตกหัวข้อ รีเสิร์ช สร้างบทความ แก้ไข และส่งโพสต์ออกจริงใน workflow เดียว
            </p>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton} onClick={() => scrollToSection("new-job")} type="button">
                เริ่มสร้างงาน
              </button>
              <button className={styles.ghostButton} onClick={() => scrollToSection("workspace")} type="button">
                ดูโปรเจกต์
              </button>
            </div>
          </div>

          <div className={styles.stepGrid}>
            <article className={styles.stepCard}>
              <span className={styles.stepNumber}>1</span>
              <strong>สร้างโปรเจกต์</strong>
              <p>ตั้งชื่อโปรเจกต์และใส่คีย์เวิร์ดหลักเพื่อเริ่มชุดงานใหม่</p>
            </article>
            <article className={styles.stepCard}>
              <span className={styles.stepNumber}>2</span>
              <strong>สร้างบรีฟและบทความ</strong>
              <p>เลือกหัวข้อ รีเสิร์ช สร้าง SEO brief และ draft พร้อมชุดภาพที่สอดคล้องกับบทความ</p>
            </article>
            <article className={styles.stepCard}>
              <span className={styles.stepNumber}>3</span>
              <strong>รีวิวและส่งโพสต์</strong>
              <p>แก้บทความ อนุมัติงาน แล้วส่งขึ้น WordPress หรือดาวน์โหลดเป็น deliverable ได้ทันที</p>
            </article>
          </div>
        </section>

        <section id="dashboard" className={styles.overviewGrid}>
          {summary.map((item) => (
            <article key={item.label} className={styles.summaryCard}>
              <span className={styles.label}>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.hint}</p>
            </article>
          ))}
        </section>

        <section className={styles.dashboardGrid}>
          <article className={styles.panel}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.label}>สถานะระบบ</span>
                <h2>System readiness</h2>
              </div>
              <span className={styles.statusChip}>{error || statusMessage}</span>
            </div>
            <div className={styles.systemGrid}>
              {systemCards.map((card) => (
                <div key={card.label} className={styles.systemCard}>
                  <span className={styles.label}>{card.label}</span>
                  <strong>{card.value}</strong>
                  <span
                    className={
                      card.tone === "ready"
                        ? styles.systemReady
                        : card.tone === "running"
                          ? styles.systemRunning
                          : styles.systemMuted
                    }
                  >
                    {card.tone === "ready" ? "connected" : card.tone === "running" ? "processing" : "waiting"}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article id="settings" className={styles.panel}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.label}>ค่าตั้งต้น</span>
                <h2>Settings overview</h2>
              </div>
            </div>
            <div className={styles.settingsList}>
              <div>
                <span className={styles.label}>ภาษาเริ่มต้น</span>
                <strong>ภาษาไทย</strong>
              </div>
              <div>
                <span className={styles.label}>โทนการเขียน</span>
                <strong>สุภาพ อ่านง่าย เน้นใช้งานจริง</strong>
              </div>
              <div>
                <span className={styles.label}>ปลายทาง</span>
                <strong>WordPress publish ผ่าน n8n</strong>
              </div>
              <div>
                <span className={styles.label}>รูปภาพ</span>
                <strong>AI article images ต่อหัวข้อ</strong>
              </div>
            </div>
          </article>
        </section>

        <section id="new-job" className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.label}>เริ่มต้นใช้งาน</span>
              <h2>สร้างโปรเจกต์และสร้างงานใหม่</h2>
            </div>
          </div>
          <form className={styles.createForm} onSubmit={createJob}>
            <label>
              โปรเจกต์
              <small>ชื่อโปรเจกต์หรือเว็บไซต์ปลายทาง</small>
              <input value={client} onChange={(event) => setClient(event.target.value)} />
            </label>
            <label>
              คีย์เวิร์ดหลัก
              <small>ใช้เป็นหัวข้อหลักของบทความและการแตกไอเดีย</small>
              <input value={seedKeyword} onChange={(event) => setSeedKeyword(event.target.value)} />
            </label>
            <button className={styles.primaryButton} disabled={isPending} type="submit">
              {isPending ? "กำลังสร้าง..." : "สร้างงาน"}
            </button>
          </form>
        </section>

        {loadState === "loading" ? (
          <section className={`${styles.panel} ${styles.loadingPanel}`}>
            <div className={styles.overviewGrid}>
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className={styles.skeletonCard}>
                  <span className={styles.skeletonLine} />
                  <span className={styles.skeletonValue} />
                </div>
              ))}
            </div>
            <p className={styles.loadingText}>กำลังดึงโปรเจกต์และคิวงานล่าสุด</p>
          </section>
        ) : null}

        {loadState === "error" ? (
          <section className={`${styles.panel} ${styles.emptyState}`}>
            <div>
              <h2>โหลดข้อมูลไม่สำเร็จ</h2>
              <p>{error}</p>
            </div>
            <div className={styles.emptyActions}>
              <button className={styles.primaryButton} onClick={() => void loadJobs()} type="button">
                Retry
              </button>
            </div>
          </section>
        ) : null}

        {loadState === "empty" ? (
          <section className={`${styles.panel} ${styles.emptyState}`}>
            <div>
              <h2>ยังไม่มีโปรเจกต์ในระบบ</h2>
              <p>เริ่มต้นโดยสร้างโปรเจกต์ใหม่ แล้วใส่คีย์เวิร์ดหลักเพื่อให้ระบบแตกหัวข้อและสร้างบทความ</p>
            </div>
            <div className={styles.emptyActions}>
              <button className={styles.primaryButton} onClick={() => scrollToSection("new-job")} type="button">
                สร้างโปรเจกต์
              </button>
            </div>
          </section>
        ) : null}

        {job && loadState === "ready" ? (
          <>
            <section id="jobs" className={styles.dashboardGrid}>
              <article className={styles.panel}>
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.label}>โปรเจกต์ล่าสุด</span>
                    <h2>Projects</h2>
                  </div>
                </div>
                <div className={styles.projectList}>
                  {projectSummaries.map((project) => (
                    <button
                      key={project.client}
                      className={`${styles.projectCard} ${project.client === job.client ? styles.projectCardActive : ""}`}
                      onClick={() => {
                        const firstJob = jobs.find((item) => item.client === project.client);
                        if (firstJob) {
                          setActiveJobId(firstJob.id);
                        }
                      }}
                      type="button"
                    >
                      <strong>{getProjectName(project.client)}</strong>
                      <span>{project.jobs} งาน</span>
                      <small>{project.published} โพสต์แล้ว</small>
                    </button>
                  ))}
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.label}>คิวงานล่าสุด</span>
                    <h2>Jobs / Queue</h2>
                  </div>
                </div>
                <div className={styles.queueTable}>
                  <div className={styles.queueHead}>
                    <span>Job</span>
                    <span>Project</span>
                    <span>Status</span>
                    <span>Action</span>
                  </div>
                  {jobs.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      className={`${styles.queueRow} ${item.id === job.id ? styles.queueRowActive : ""}`}
                      onClick={() => setActiveJobId(item.id)}
                      type="button"
                    >
                      <span>{item.seedKeyword}</span>
                      <span>{getProjectName(item.client)}</span>
                      <span>{stageLabels[item.stage]}</span>
                      <span>เปิดงาน</span>
                    </button>
                  ))}
                </div>
              </article>
            </section>

            <section id="workspace" className={styles.workspace}>
              <aside className={styles.sidebar}>
                <div className={styles.panel}>
                  <div className={styles.sectionHead}>
                    <div>
                      <span className={styles.label}>Project</span>
                      <h2>{getProjectName(job.client)}</h2>
                    </div>
                    <span className={styles.keywordChip}>{job.seedKeyword}</span>
                  </div>
                  <div className={styles.miniStats}>
                    <div>
                      <span className={styles.label}>สถานะงาน</span>
                      <strong>{stageLabels[job.stage]}</strong>
                    </div>
                    <div>
                      <span className={styles.label}>หัวข้อที่เลือก</span>
                      <strong>{activeIdea?.title ?? "ยังไม่เลือก"}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.panel}>
                  <div className={styles.sectionHead}>
                    <div>
                      <span className={styles.label}>หัวข้อที่สร้างได้</span>
                      <h2>เลือกหัวข้อ</h2>
                    </div>
                  </div>
                  <div className={styles.topicTabs}>
                    {job.ideas.map((idea) => (
                      <button
                        key={idea.id}
                        className={`${styles.topicTab} ${idea.id === job.selectedIdeaId ? styles.topicTabActive : ""}`}
                        onClick={() => void selectIdea(idea.id, idea.title)}
                        type="button"
                      >
                        <strong>{idea.title}</strong>
                        <span>{idea.angle}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.panel}>
                  <div className={styles.sectionHead}>
                    <div>
                      <span className={styles.label}>Workflow</span>
                      <h2>คำสั่งหลัก</h2>
                    </div>
                  </div>
                  <div className={styles.actionGrid}>
                    <button className={styles.secondaryButton} onClick={() => void runAutomation("research", "ส่งงานรีเสิร์ชเข้าคิวแล้ว")} type="button">
                      รีเสิร์ช
                    </button>
                    <button className={styles.secondaryButton} onClick={() => void runAutomation("brief", "ส่งงานสร้างบรีฟเข้าคิวแล้ว")} type="button">
                      สร้างบรีฟ
                    </button>
                    <button className={styles.secondaryButton} onClick={() => void runAutomation("draft", "ส่งงานสร้างบทความเข้าคิวแล้ว")} type="button">
                      สร้างบทความ
                    </button>
                    <button className={styles.secondaryButton} onClick={() => void runJobAction(`/api/jobs/${job.id}/images`, { method: "POST" }, "สร้างชุดภาพใหม่แล้ว")} type="button">
                      AI images
                    </button>
                    <button className={styles.secondaryButton} onClick={() => void approveCurrentJob()} type="button">
                      อนุมัติ
                    </button>
                    <button className={styles.primaryButton} onClick={() => void runAutomation("publish", "ส่งขึ้น WordPress แล้ว")} type="button">
                      ส่งขึ้น WordPress
                    </button>
                  </div>
                  <div className={styles.exportRow}>
                    <button className={styles.ghostButton} onClick={() => downloadDeliverable("markdown")} type="button">
                      ดาวน์โหลด MD
                    </button>
                    <button className={styles.ghostButton} onClick={() => downloadDeliverable("json")} type="button">
                      ดาวน์โหลด JSON
                    </button>
                  </div>
                </div>

                <div className={styles.panel}>
                  <div className={styles.sectionHead}>
                    <div>
                      <span className={styles.label}>Logs</span>
                      <h2>Automation logs</h2>
                    </div>
                  </div>
                  <div className={styles.eventList}>
                    {recentEvents.length > 0 ? (
                      recentEvents.slice(0, 6).map((event) => (
                        <article key={event.id} className={styles.eventItem}>
                          <div className={styles.eventTop}>
                            <strong>{event.type}</strong>
                            <span className={styles.eventStatus}>{automationStatusLabels[event.status]}</span>
                          </div>
                          <p>{event.message ?? "ไม่มีข้อความเพิ่มเติม"}</p>
                          <small>
                            {getDurationLabel(event)} • {new Date(event.updatedAt).toLocaleString("th-TH")}
                          </small>
                        </article>
                      ))
                    ) : (
                      <div className={styles.eventEmpty}>ยังไม่มี log ในงานนี้</div>
                    )}
                  </div>
                </div>
              </aside>

              <section className={styles.content}>
                <div className={styles.contentTabs}>
                  <button
                    className={`${styles.contentTab} ${contentView === "article" ? styles.contentTabActive : ""}`}
                    onClick={() => setContentView("article")}
                    type="button"
                  >
                    บทความ
                  </button>
                  <button
                    className={`${styles.contentTab} ${contentView === "images" ? styles.contentTabActive : ""}`}
                    onClick={() => setContentView("images")}
                    type="button"
                  >
                    ภาพในบทความ
                  </button>
                  <button
                    className={`${styles.contentTab} ${contentView === "structure" ? styles.contentTabActive : ""}`}
                    onClick={() => setContentView("structure")}
                    type="button"
                  >
                    โครงสร้าง
                  </button>
                </div>

                {contentView === "article" ? (
                  <div className={`${styles.articleWorkspace} ${styles.motionBlock}`}>
                    <section className={`${styles.panel} ${styles.editorPanel}`}>
                      <div className={styles.editorFields}>
                        <div className={styles.editorSection}>
                          <div className={styles.editorSectionHead}>
                            <strong>SEO brief</strong>
                            <button className={styles.primaryButton} onClick={() => void saveBrief()} type="button">
                              บันทึก brief
                            </button>
                          </div>
                          <label className={styles.editorField}>
                            <span>Title</span>
                            <small>หัวข้อหลักของบทความที่จะใช้แสดงผลจริง</small>
                            <input value={briefTitle} onChange={(event) => setBriefTitle(event.target.value)} />
                          </label>
                          <label className={styles.editorField}>
                            <span>Meta title</span>
                            <small>ข้อความสำหรับ SEO title</small>
                            <input value={briefMetaTitle} onChange={(event) => setBriefMetaTitle(event.target.value)} />
                          </label>
                          <label className={styles.editorField}>
                            <span>Meta description</span>
                            <small>สรุปเนื้อหาสำหรับหน้า search</small>
                            <textarea rows={3} value={briefMetaDescription} onChange={(event) => setBriefMetaDescription(event.target.value)} />
                          </label>
                          <label className={styles.editorField}>
                            <span>Slug</span>
                            <small>ใช้เป็น URL ของโพสต์</small>
                            <input value={briefSlug} onChange={(event) => setBriefSlug(event.target.value)} />
                          </label>
                          <label className={styles.editorField}>
                            <span>Featured image URL</span>
                            <small>ถ้าไม่ใส่ ระบบจะใช้ภาพแรกจากชุด AI image</small>
                            <input value={briefFeaturedImageUrl} onChange={(event) => setBriefFeaturedImageUrl(event.target.value)} />
                          </label>
                        </div>

                        <div className={styles.editorSection}>
                          <div className={styles.editorSectionHead}>
                            <strong>บทความ</strong>
                            <button className={styles.primaryButton} onClick={() => void saveDraft()} type="button">
                              บันทึกบทความ
                            </button>
                          </div>
                          <label className={styles.editorField}>
                            <span>บทนำ</span>
                            <small>ส่วนเปิดเรื่องก่อนเข้าเนื้อหาหลัก</small>
                            <textarea rows={5} value={draftIntro} onChange={(event) => setDraftIntro(event.target.value)} />
                          </label>
                          <div className={styles.editorSubsection}>
                            <span className={styles.label}>Sections</span>
                            <ul className={styles.simpleList}>
                              {job.draft.sections.map((section) => (
                                <li key={section.heading}>
                                  <strong>{section.heading}</strong>
                                  <span className={styles.subtle}>{section.body.slice(0, 120)}...</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <label className={styles.editorField}>
                            <span>สรุปท้ายบทความ</span>
                            <small>ใช้ปิดบทความและชวนทำ action ต่อ</small>
                            <textarea rows={5} value={draftConclusion} onChange={(event) => setDraftConclusion(event.target.value)} />
                          </label>
                        </div>
                      </div>
                    </section>

                    <article className={`${styles.articleLayout} ${styles.motionBlock}`}>
                      <div className={styles.heroImage}>
                        <Image alt={articleImages[0]?.alt ?? "Featured article image"} height={900} src={featuredImageSrc} width={1600} />
                      </div>
                      <div className={styles.articleMeta}>
                        <span>Keyword: {job.seedKeyword}</span>
                        <span>Status: {stageLabels[job.stage]}</span>
                        <span>Slug: /{briefSlug || "your-post-slug"}</span>
                      </div>
                      <div className={styles.articleBody}>
                        <h2 className={styles.previewTitle}>{briefTitle}</h2>
                        <p className={styles.previewMeta}>{briefMetaDescription}</p>
                        <p className={styles.articleIntro}>{draftIntro}</p>

                        {job.draft.sections.map((section, index) => {
                          const image = articleImages[index + 1];

                          return (
                            <section key={section.heading} className={styles.articleSection}>
                              <h3>{section.heading}</h3>
                              <p>{section.body}</p>

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

                        <p className={styles.articleConclusion}>{draftConclusion}</p>
                      </div>
                    </article>
                  </div>
                ) : null}

                {contentView === "images" ? (
                  <div className={`${styles.panel} ${styles.motionBlock}`}>
                    <div className={styles.featuredImageCard}>
                      <div className={styles.featuredImageFrame}>
                        <Image alt={articleImages[0]?.alt ?? "Featured image"} height={920} src={featuredImageSrc} width={1600} />
                      </div>
                      <div className={styles.featuredImageMeta}>
                        <strong>{articleImages[0]?.caption ?? "ภาพหลักของบทความ"}</strong>
                        <p>{articleImages[0]?.alt ?? "ยังไม่มี alt text"}</p>
                        <span>{articleImages[0]?.placement ?? "Featured image"}</span>
                        {articleImages[0]?.prompt ? <code>{articleImages[0].prompt}</code> : null}
                      </div>
                    </div>
                    <div className={styles.imageGrid}>
                      {articleImages.slice(1).map((image) => (
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
                  </div>
                ) : null}

                {contentView === "structure" ? (
                  <div className={`${styles.panel} ${styles.motionBlock}`}>
                    <div className={styles.twoColumn}>
                      <div>
                        <h3 className={styles.smallHeading}>Outline</h3>
                        <ol className={styles.simpleListOrdered}>
                          {job.brief.outline.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <h3 className={styles.smallHeading}>FAQ</h3>
                        <ul className={styles.simpleList}>
                          {job.brief.faqs.map((faq) => (
                            <li key={faq}>{faq}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
