"use client";

import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  type WorkflowAutomationStatus,
  type WorkflowAutomationType,
  type WorkflowJob,
  type WorkflowStage
} from "@/types/workflow";
import styles from "./workflow-dashboard.module.css";

type ArticleImage = {
  src: string;
  alt: string;
  caption: string;
  placement: string;
};

const stageLabels: Record<WorkflowStage, string> = {
  idea_pool: "คลังไอเดีย",
  selected: "เลือกหัวข้อแล้ว",
  researching: "รีเสิร์ช",
  brief_ready: "บรีฟพร้อม",
  drafting: "ดราฟต์",
  review: "ตรวจทาน",
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

const imageThemes = {
  health: [
    "/article-images/goldfish-health-1.svg",
    "/article-images/goldfish-health-2.svg",
    "/article-images/goldfish-health-3.svg"
  ],
  water: [
    "/article-images/goldfish-water-1.svg",
    "/article-images/goldfish-water-2.svg",
    "/article-images/goldfish-water-3.svg"
  ],
  food: [
    "/article-images/goldfish-food-1.svg",
    "/article-images/goldfish-food-2.svg",
    "/article-images/goldfish-food-3.svg"
  ],
  shared: [
    "/article-images/goldfish-detail-1.svg",
    "/article-images/goldfish-detail-2.svg"
  ]
} as const;

function getTheme(title: string) {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes("โรค")) {
    return "health" as const;
  }

  if (lowerTitle.includes("น้ำ") || lowerTitle.includes("ph")) {
    return "water" as const;
  }

  return "food" as const;
}

function getArticleImages(title: string): ArticleImage[] {
  const theme = getTheme(title);
  const base = imageThemes[theme];

  return [
    {
      src: base[0],
      alt: `ภาพเปิดบทความสำหรับหัวข้อ ${title}`,
      caption: "ภาพเปิดบทความ",
      placement: "ก่อนบทนำ"
    },
    {
      src: base[1],
      alt: `ภาพประกอบหัวข้อหลักของบทความ ${title}`,
      caption: "ภาพประกอบหัวข้อหลัก",
      placement: "หลัง H2 แรก"
    },
    {
      src: base[2],
      alt: `ภาพอธิบายวิธีดูแลหรือวิธีทำสำหรับหัวข้อ ${title}`,
      caption: "ภาพอธิบายขั้นตอนหรือวิธีดูแล",
      placement: "หลัง H2 ที่สอง"
    },
    {
      src: imageThemes.shared[0],
      alt: `ภาพ close-up สำหรับแทรกกลางบทความ ${title}`,
      caption: "ภาพคั่นกลางบทความ",
      placement: "ช่วงกลางบทความ"
    },
    {
      src: imageThemes.shared[1],
      alt: `ภาพสรุปท้ายบทความ ${title}`,
      caption: "ภาพสรุปท้ายบทความ",
      placement: "ก่อนสรุป"
    }
  ];
}

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

      const nextJobs = data.jobs;
      setJobs(nextJobs);
      setActiveJobId((current) => current || nextJobs[0]?.id || "");
      setStatusMessage(nextJobs.length > 0 ? "พร้อมใช้งาน" : "ยังไม่มีงาน");
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ");
      setStatusMessage("เกิดข้อผิดพลาด");
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  async function runJobAction(
    path: string,
    options?: RequestInit,
    successMessage?: string
  ) {
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
                Project
                <input value={client} onChange={(event) => setClient(event.target.value)} />
              </label>
              <label>
                Seed keyword
                <input value={seedKeyword} onChange={(event) => setSeedKeyword(event.target.value)} />
              </label>
              <button className={styles.primaryButton} disabled={isPending} type="submit">
                {isPending ? "Creating..." : "Create job"}
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
              Project
              <input value={client} onChange={(event) => setClient(event.target.value)} />
            </label>
            <label>
              Seed keyword
              <input value={seedKeyword} onChange={(event) => setSeedKeyword(event.target.value)} />
            </label>
            <button className={styles.primaryButton} disabled={isPending} type="submit">
              {isPending ? "Creating..." : "Create job"}
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
                  <span className={styles.label}>Project</span>
                  <h2>{getProjectName(job.client)}</h2>
                </div>
                <span className={styles.keywordChip}>{job.seedKeyword}</span>
              </div>
              <div className={styles.miniStats}>
                <div>
                  <span className={styles.label}>Current stage</span>
                  <strong>{stageLabels[job.stage]}</strong>
                </div>
                <div>
                  <span className={styles.label}>Latest event</span>
                  <strong>
                    {latestEvent
                      ? `${automationTypeLabels[latestEvent.type]} / ${automationStatusLabels[latestEvent.status]}`
                      : "No event"}
                  </strong>
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
              <div className={styles.ideaList}>
                {job.ideas.map((idea) => {
                  const selected = idea.id === job.selectedIdeaId;

                  return (
                    <button
                      key={idea.id}
                      className={`${styles.ideaCard} ${selected ? styles.ideaCardSelected : ""}`}
                      disabled={isPending}
                      onClick={() =>
                        updateJob(
                          `/api/jobs/${job.id}/ideas/select`,
                          `เลือกหัวข้อ "${idea.title}" แล้ว`,
                          { ideaId: idea.id }
                        )
                      }
                      type="button"
                    >
                      <div className={styles.ideaMeta}>
                        <span>{searchIntentLabels[idea.searchIntent]}</span>
                        <span>{difficultyLabels[idea.difficulty]}</span>
                        <span>{idea.confidence}%</span>
                      </div>
                      <strong>{idea.title}</strong>
                      <p>{idea.angle}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.label}>Actions</span>
                  <h2>Workflow</h2>
                </div>
              </div>
              <div className={styles.actionGrid}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => updateJob(`/api/jobs/${job.id}/research`, "อัปเดตรีเสิร์ชแล้ว")}
                  type="button"
                >
                  Research
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => updateJob(`/api/jobs/${job.id}/brief`, "สร้างบรีฟแล้ว")}
                  type="button"
                >
                  Brief
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => updateJob(`/api/jobs/${job.id}/draft`, "สร้างดราฟต์แล้ว")}
                  type="button"
                >
                  Draft
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => updateJob(`/api/jobs/${job.id}/approve`, "อนุมัติบทความแล้ว")}
                  type="button"
                >
                  Approve
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => updateJob(`/api/jobs/${job.id}/publish`, "ส่งเผยแพร่ในระบบแล้ว")}
                  type="button"
                >
                  Publish
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => void runAutomation("publish")}
                  type="button"
                >
                  Send to n8n
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
              <div className={styles.articleHeader}>
                <div>
                  <span className={styles.label}>SEO brief</span>
                  <h2>{job.brief.title}</h2>
                  <p className={styles.subtle}>{job.brief.angle}</p>
                </div>
                <div className={styles.metaBox}>
                  <span className={styles.label}>Meta title</span>
                  <strong>{job.brief.metaTitle}</strong>
                  <span className={styles.label}>Slug</span>
                  <strong>/{job.brief.slug}</strong>
                </div>
              </div>
            </div>

            <article className={styles.articleLayout}>
              <div className={styles.heroImage}>
                <Image
                  alt={articleImages[0]?.alt ?? job.brief.title}
                  height={720}
                  src={articleImages[0]?.src ?? "/article-images/goldfish-water-1.svg"}
                  width={1280}
                />
              </div>

              <div className={styles.articleMeta}>
                <span>{articleImages[0]?.caption}</span>
                <span>{articleImages[0]?.placement}</span>
              </div>

              <div className={styles.articleBody}>
                <p className={styles.articleIntro}>{job.draft.intro}</p>

                {job.draft.sections.map((section, index) => (
                  <section key={section.heading} className={styles.articleSection}>
                    <h3>{section.heading}</h3>
                    <p>{section.body}</p>
                    {articleImages[index + 1] ? (
                      <figure className={styles.inlineFigure}>
                        <div className={styles.inlineImage}>
                          {(() => {
                            const image = articleImages[index + 1];

                            if (!image) {
                              return null;
                            }

                            return (
                              <Image
                                alt={image.alt}
                                height={720}
                                src={image.src}
                                width={1280}
                              />
                            );
                          })()}
                        </div>
                        {(() => {
                          const image = articleImages[index + 1];

                          if (!image) {
                            return null;
                          }

                          return (
                            <figcaption>
                              <strong>{image.caption}</strong>
                              <span>{image.placement}</span>
                            </figcaption>
                          );
                        })()}
                      </figure>
                    ) : null}
                  </section>
                ))}

                <p className={styles.articleConclusion}>{job.draft.conclusion}</p>
              </div>
            </article>

            <div className={styles.panel}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.label}>Article images</span>
                  <h2>Image pack</h2>
                </div>
              </div>
              <div className={styles.imageGrid}>
                {articleImages.map((image) => (
                  <article key={image.src} className={styles.imageCard}>
                    <div className={styles.imageThumb}>
                      <Image alt={image.alt} height={720} src={image.src} width={1280} />
                    </div>
                    <strong>{image.caption}</strong>
                    <p>{image.alt}</p>
                    <span>{image.placement}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.label}>Outline</span>
                  <h2>Structure</h2>
                </div>
              </div>
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

            <div className={styles.panel}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.label}>Events</span>
                  <h2>ล่าสุด</h2>
                </div>
              </div>
              <div className={styles.eventList}>
                {(job.automationEvents ?? []).slice(0, 6).map((event) => (
                  <div key={event.id} className={styles.eventRow}>
                    <div>
                      <strong>{automationTypeLabels[event.type]}</strong>
                      <p>{event.message ?? "ไม่มีข้อความเพิ่มเติม"}</p>
                    </div>
                    <div className={styles.eventMeta}>
                      <span>{automationStatusLabels[event.status]}</span>
                      <span>{formatDateTime(event.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
