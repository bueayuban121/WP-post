"use client";

import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { getArticleImages } from "@/lib/article-images";
import {
  type WorkflowAutomationStatus,
  type WorkflowAutomationType,
  type WorkflowJob,
  type WorkflowStage
} from "@/types/workflow";
import styles from "./workflow-dashboard.module.css";

type ContentView = "article" | "images" | "structure";

const stageLabels: Record<WorkflowStage, string> = {
  idea_pool: "คลังหัวข้อ",
  selected: "เลือกหัวข้อแล้ว",
  researching: "รีเสิร์ช",
  brief_ready: "บรีฟพร้อม",
  drafting: "กำลังเขียน",
  review: "รอตรวจ",
  approved: "อนุมัติแล้ว",
  published: "เผยแพร่แล้ว"
};

const automationStatusLabels: Record<WorkflowAutomationStatus, string> = {
  queued: "รอคิว",
  running: "กำลังทำงาน",
  succeeded: "สำเร็จ",
  failed: "ต้องตรวจสอบ"
};

const automationTypeLabels: Record<WorkflowAutomationType, string> = {
  research: "รีเสิร์ช",
  brief: "บรีฟ",
  draft: "ดราฟต์",
  publish: "เผยแพร่"
};

const searchIntentLabels = {
  informational: "Informational",
  commercial: "Commercial",
  "problem-solving": "Problem-solving"
} as const;

const difficultyLabels = {
  low: "Easy",
  medium: "Medium",
  high: "Hard"
} as const;

const contentViewLabels: Record<ContentView, string> = {
  article: "บทความ",
  images: "ภาพ",
  structure: "โครง"
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getProjectName(name: string) {
  return name.trim() || "โปรเจกต์ใหม่";
}

export function WorkflowDashboard() {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [activeJobId, setActiveJobId] = useState("");
  const [client, setClient] = useState("AquaCare Thailand");
  const [seedKeyword, setSeedKeyword] = useState("ปลาทอง");
  const [contentView, setContentView] = useState<ContentView>("article");
  const [draftIntro, setDraftIntro] = useState("");
  const [draftConclusion, setDraftConclusion] = useState("");
  const [draftSections, setDraftSections] = useState<Array<{ heading: string; body: string }>>([]);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("กำลังโหลดข้อมูล...");
  const [isPending, startTransition] = useTransition();

  const job = jobs.find((item) => item.id === activeJobId) ?? jobs[0] ?? null;
  const selectedIdea = job?.ideas.find((idea) => idea.id === job.selectedIdeaId) ?? job?.ideas[0] ?? null;
  const articleImages = useMemo(
    () => (selectedIdea ? getArticleImages(selectedIdea.title) : []),
    [selectedIdea]
  );
  const latestEvent = job?.automationEvents?.[0] ?? null;

  const loadJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const data = (await response.json()) as { error?: string; jobs?: WorkflowJob[] };

      if (!response.ok || !data.jobs) {
        throw new Error(data.error ?? "โหลดรายการงานไม่สำเร็จ");
      }

      setJobs(data.jobs);
      setActiveJobId((current) => current || data.jobs?.[0]?.id || "");
      setStatusMessage(data.jobs.length > 0 ? "พร้อมใช้งาน" : "ยังไม่มีงาน");
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ");
      setStatusMessage("เกิดข้อผิดพลาด");
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!job) return;
    setDraftIntro(job.draft.intro);
    setDraftConclusion(job.draft.conclusion);
    setDraftSections(job.draft.sections.map((section) => ({ ...section })));
  }, [job]);

  async function runJobAction(path: string, options?: RequestInit, successMessage?: string) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {})
      }
    });

    const data = (await response.json()) as { error?: string; job?: WorkflowJob };

    if (!response.ok || !data.job) {
      throw new Error(data.error ?? "คำขอไม่สำเร็จ");
    }

    const nextJob = data.job;

    setJobs((current) =>
      current.some((item) => item.id === nextJob.id)
        ? current.map((item) => (item.id === nextJob.id ? nextJob : item))
        : [nextJob, ...current]
    );
    setActiveJobId(nextJob.id);
    setStatusMessage(successMessage ?? "อัปเดตเรียบร้อย");
    setError("");
  }

  function updateJob(path: string, successMessage: string, body?: Record<string, string>) {
    if (!job) return;

    startTransition(async () => {
      try {
        await runJobAction(
          path,
          {
            method: "POST",
            body: body ? JSON.stringify(body) : undefined
          },
          successMessage
        );
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "อัปเดตไม่สำเร็จ");
      }
    });
  }

  async function runAutomation(type: WorkflowAutomationType) {
    if (!job) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/jobs/${job.id}/automation/${type}`, {
          method: "POST"
        });

        const data = (await response.json()) as {
          error?: string;
          job?: WorkflowJob;
          automation?: { message?: string };
        };

        if (!response.ok) {
          throw new Error(data.error ?? "ส่งงานเข้า automation ไม่สำเร็จ");
        }

        if (data.job) {
          const nextJob = data.job;
          setJobs((current) => current.map((item) => (item.id === nextJob.id ? nextJob : item)));
          setActiveJobId(nextJob.id);
        } else {
          await loadJobs();
        }

        setStatusMessage(data.automation?.message ?? `ส่ง${automationTypeLabels[type]}เข้า automation แล้ว`);
        setError("");
      } catch (automationError) {
        setError(automationError instanceof Error ? automationError.message : "ส่งงานไม่สำเร็จ");
      }
    });
  }

  async function handleCreateJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      try {
        await runJobAction(
          "/api/jobs",
          {
            method: "POST",
            body: JSON.stringify({ client, seedKeyword })
          },
          `สร้างงานใหม่สำหรับ ${getProjectName(client)} แล้ว`
        );
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "สร้างงานไม่สำเร็จ");
      }
    });
  }

  const isDraftDirty =
    !!job &&
    (draftIntro !== job.draft.intro ||
      draftConclusion !== job.draft.conclusion ||
      JSON.stringify(draftSections) !== JSON.stringify(job.draft.sections));

  async function saveDraftEdits() {
    if (!job) return;

    startTransition(async () => {
      try {
        await runJobAction(
          `/api/jobs/${job.id}/draft`,
          {
            method: "POST",
            body: JSON.stringify({
              intro: draftIntro,
              conclusion: draftConclusion,
              sections: draftSections
            })
          },
          "บันทึกบทความแล้ว"
        );
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "บันทึกบทความไม่สำเร็จ");
      }
    });
  }

  function updateDraftSection(index: number, field: "heading" | "body", value: string) {
    setDraftSections((current) =>
      current.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [field]: value } : section
      )
    );
  }

  async function downloadDeliverable(format: "markdown" | "json") {
    if (!job) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/jobs/${job.id}/deliverable?format=${format}`);

        if (!response.ok) {
          throw new Error("ดาวน์โหลดไฟล์ไม่สำเร็จ");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${job.brief.slug || job.id}.${format === "markdown" ? "md" : "json"}`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);
        setStatusMessage(format === "markdown" ? "ดาวน์โหลด Markdown แล้ว" : "ดาวน์โหลด JSON แล้ว");
      } catch (downloadError) {
        setError(downloadError instanceof Error ? downloadError.message : "ดาวน์โหลดไฟล์ไม่สำเร็จ");
      }
    });
  }

  function renderArticle() {
    return (
      <div className={styles.articleWorkspace}>
        <section className={`${styles.panel} ${styles.editorPanel} ${styles.motionBlock}`}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.label}>Editor</span>
              <h2>แก้บทความ</h2>
            </div>
            <div className={styles.editorActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => updateJob(`/api/jobs/${job.id}/draft`, "สร้างดราฟต์ใหม่แล้ว")}
                type="button"
              >
                สร้างใหม่
              </button>
              <button
                className={styles.primaryButton}
                disabled={!isDraftDirty || isPending}
                onClick={() => void saveDraftEdits()}
                type="button"
              >
                บันทึกบทความ
              </button>
            </div>
          </div>

          <div className={styles.editorFields}>
            <label className={styles.editorField}>
              <span>บทนำ</span>
              <textarea rows={5} value={draftIntro} onChange={(event) => setDraftIntro(event.target.value)} />
            </label>

            {draftSections.map((section, index) => (
              <div key={`${index}-${section.heading}`} className={styles.editorSection}>
                <label className={styles.editorField}>
                  <span>หัวข้อย่อย {index + 1}</span>
                  <input
                    value={section.heading}
                    onChange={(event) => updateDraftSection(index, "heading", event.target.value)}
                  />
                </label>
                <label className={styles.editorField}>
                  <span>เนื้อหา</span>
                  <textarea
                    rows={7}
                    value={section.body}
                    onChange={(event) => updateDraftSection(index, "body", event.target.value)}
                  />
                </label>
              </div>
            ))}

            <label className={styles.editorField}>
              <span>สรุปท้ายบทความ</span>
              <textarea
                rows={5}
                value={draftConclusion}
                onChange={(event) => setDraftConclusion(event.target.value)}
              />
            </label>
          </div>
        </section>

        <article className={`${styles.articleLayout} ${styles.motionBlock}`}>
          <div className={styles.heroImage}>
            <Image
              alt={articleImages[0]?.alt ?? job?.brief.title ?? "Hero image"}
              height={900}
              priority
              src={articleImages[0]?.src ?? "/article-images/goldfish-water-1.svg"}
              width={1600}
            />
          </div>

          <div className={styles.articleMeta}>
            <span>{articleImages[0]?.caption}</span>
            <span>{articleImages[0]?.placement}</span>
          </div>

          <div className={styles.articleBody}>
            <p className={styles.articleIntro}>{draftIntro}</p>

            {draftSections.map((section, index) => {
              const image = articleImages[index + 1];

              return (
                <section key={`${section.heading}-${index}`} className={styles.articleSection}>
                  <h3>{section.heading}</h3>
                  <p>{section.body}</p>
                  {image ? (
                    <figure className={styles.inlineFigure}>
                      <div className={styles.inlineImage}>
                        <Image alt={image.alt} height={840} src={image.src} width={1400} />
                      </div>
                      <figcaption>
                        <strong>{image.caption}</strong>
                        <span>{image.placement}</span>
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
    );
  }

  function renderImages() {
    return (
      <div className={`${styles.panel} ${styles.motionBlock}`}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.label}>Article images</span>
            <h2>ภาพที่ใช้ในบทความ</h2>
          </div>
        </div>

        <div className={styles.featuredImageCard}>
          <div className={styles.featuredImageFrame}>
            <Image alt={articleImages[0]?.alt ?? "Featured image"} height={920} src={articleImages[0]?.src ?? "/article-images/goldfish-water-1.svg"} width={1600} />
          </div>
          <div className={styles.featuredImageMeta}>
            <strong>{articleImages[0]?.caption}</strong>
            <p>{articleImages[0]?.alt}</p>
            <span>{articleImages[0]?.placement}</span>
          </div>
        </div>

        <div className={styles.imageGrid}>
          {articleImages.slice(1).map((image) => (
            <article key={image.src} className={styles.imageCard}>
              <div className={styles.imageThumbLarge}>
                <Image alt={image.alt} height={840} src={image.src} width={1400} />
              </div>
              <strong>{image.caption}</strong>
              <p>{image.alt}</p>
              <span>{image.placement}</span>
            </article>
          ))}
        </div>
      </div>
    );
  }

  function renderStructure() {
    return (
      <div className={`${styles.panel} ${styles.motionBlock}`}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.label}>Structure</span>
            <h2>โครงบทความ</h2>
          </div>
        </div>

        <div className={styles.twoColumn}>
          <div>
            <h3 className={styles.smallHeading}>Outline</h3>
            <ol className={styles.simpleListOrdered}>
              {job?.brief.outline.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className={styles.smallHeading}>FAQ</h3>
            <ul className={styles.simpleList}>
              {job?.brief.faqs.map((faq) => (
                <li key={faq}>{faq}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!job || !selectedIdea) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.topbar}>
            <div>
              <span className={styles.kicker}>Auto Post Content</span>
              <h1 className={styles.title}>Auto Post Content</h1>
            </div>
            <span className={styles.statusChip}>{error || statusMessage}</span>
          </header>

          <section className={styles.panel}>
            <form className={styles.createForm} onSubmit={handleCreateJob}>
              <label>
                โปรเจกต์
                <input value={client} onChange={(event) => setClient(event.target.value)} />
              </label>
              <label>
                Keyword หลัก
                <input value={seedKeyword} onChange={(event) => setSeedKeyword(event.target.value)} />
              </label>
              <button className={styles.primaryButton} disabled={isPending} type="submit">
                {isPending ? "กำลังสร้าง..." : "สร้างงาน"}
              </button>
            </form>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.kicker}>Auto Post Content</span>
            <h1 className={styles.title}>Auto Post Content</h1>
          </div>
          <div className={styles.topbarMeta}>
            <span className={styles.statusChip}>{error || statusMessage}</span>
            <span className={styles.statusChipMuted}>{stageLabels[job.stage]}</span>
          </div>
        </header>

        <section className={styles.panel}>
          <form className={styles.createForm} onSubmit={handleCreateJob}>
            <label>
              โปรเจกต์
              <input value={client} onChange={(event) => setClient(event.target.value)} />
            </label>
            <label>
              Keyword หลัก
              <input value={seedKeyword} onChange={(event) => setSeedKeyword(event.target.value)} />
            </label>
            <button className={styles.primaryButton} disabled={isPending} type="submit">
              {isPending ? "กำลังสร้าง..." : "สร้างงาน"}
            </button>
          </form>

          <div className={styles.jobRow}>
            {jobs.map((item) => (
              <button
                key={item.id}
                className={`${styles.jobChip} ${item.id === job.id ? styles.jobChipActive : ""}`}
                onClick={() => setActiveJobId(item.id)}
                type="button"
              >
                {getProjectName(item.client)}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.workspace}>
          <aside className={styles.sidebar}>
            <div className={styles.panel}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.label}>โปรเจกต์</span>
                  <h2>{getProjectName(job.client)}</h2>
                </div>
                <span className={styles.keywordChip}>{job.seedKeyword}</span>
              </div>

              <div className={styles.miniStats}>
                <div>
                  <span className={styles.label}>สถานะ</span>
                  <strong>{stageLabels[job.stage]}</strong>
                </div>
                <div>
                  <span className={styles.label}>ล่าสุด</span>
                  <strong>{latestEvent ? formatDateTime(latestEvent.updatedAt) : "-"}</strong>
                </div>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.label}>Topics</span>
                  <h2>เลือกหัวข้อ</h2>
                </div>
              </div>

              <div className={styles.topicTabs}>
                {job.ideas.map((idea) => {
                  const selected = idea.id === job.selectedIdeaId;

                  return (
                    <button
                      key={idea.id}
                      className={`${styles.topicTab} ${selected ? styles.topicTabActive : ""}`}
                      disabled={isPending}
                      onClick={() =>
                        updateJob(`/api/jobs/${job.id}/ideas/select`, `เลือกหัวข้อ "${idea.title}" แล้ว`, {
                          ideaId: idea.id
                        })
                      }
                      type="button"
                    >
                      <strong>{idea.title}</strong>
                      <span>{idea.angle}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.label}>Workflow</span>
                  <h2>ลำดับงาน</h2>
                </div>
              </div>

              <div className={styles.actionGrid}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => updateJob(`/api/jobs/${job.id}/research`, "อัปเดตรีเสิร์ชแล้ว")}
                  type="button"
                >
                  รีเสิร์ช
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => updateJob(`/api/jobs/${job.id}/brief`, "สร้างบรีฟแล้ว")}
                  type="button"
                >
                  บรีฟ
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => updateJob(`/api/jobs/${job.id}/draft`, "สร้างดราฟต์แล้ว")}
                  type="button"
                >
                  ดราฟต์
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => updateJob(`/api/jobs/${job.id}/approve`, "อนุมัติบทความแล้ว")}
                  type="button"
                >
                  อนุมัติ
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => updateJob(`/api/jobs/${job.id}/publish`, "ส่งเผยแพร่แล้ว")}
                  type="button"
                >
                  เผยแพร่
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => void runAutomation("publish")}
                  type="button"
                >
                  ส่งเข้า n8n
                </button>
              </div>
              <div className={styles.exportRow}>
                <button
                  className={styles.ghostButton}
                  onClick={() => void downloadDeliverable("markdown")}
                  type="button"
                >
                  ดาวน์โหลด MD
                </button>
                <button
                  className={styles.ghostButton}
                  onClick={() => void downloadDeliverable("json")}
                  type="button"
                >
                  ดาวน์โหลด JSON
                </button>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.label}>Research</span>
                  <h2>Key notes</h2>
                </div>
              </div>

              <ul className={styles.simpleList}>
                {job.research.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          </aside>

          <section className={styles.content}>
            <div className={styles.panel}>
              <div className={styles.briefStrip}>
                <div>
                  <span className={styles.label}>SEO brief</span>
                  <h2>{job.brief.title}</h2>
                  <p className={styles.subtle}>{job.brief.angle}</p>
                </div>
                <div className={styles.briefMeta}>
                  <span>{job.brief.metaTitle}</span>
                  <span>/{job.brief.slug}</span>
                </div>
              </div>
            </div>

            <div className={styles.contentTabs}>
              {(Object.keys(contentViewLabels) as ContentView[]).map((view) => (
                <button
                  key={view}
                  className={`${styles.contentTab} ${contentView === view ? styles.contentTabActive : ""}`}
                  onClick={() => setContentView(view)}
                  type="button"
                >
                  {contentViewLabels[view]}
                </button>
              ))}
            </div>

            {contentView === "article" ? renderArticle() : null}
            {contentView === "images" ? renderImages() : null}
            {contentView === "structure" ? renderStructure() : null}

            {latestEvent ? (
              <div className={styles.panel}>
                <div className={styles.latestRow}>
                  <div>
                    <span className={styles.label}>Automation</span>
                    <strong>
                      {automationTypeLabels[latestEvent.type]} / {automationStatusLabels[latestEvent.status]}
                    </strong>
                  </div>
                  <span className={styles.statusChipMuted}>{formatDateTime(latestEvent.updatedAt)}</span>
                </div>
              </div>
            ) : null}
          </section>
        </section>
      </section>
    </main>
  );
}
