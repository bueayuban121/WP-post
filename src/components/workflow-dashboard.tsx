"use client";

import { type FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import { workflowStages } from "@/data/mock-workflow";
import {
  WorkflowAutomationStatus,
  WorkflowAutomationType,
  WorkflowJob,
  WorkflowStage
} from "@/types/workflow";
import styles from "./workflow-dashboard.module.css";

const stageLabels: Record<WorkflowStage, string> = {
  idea_pool: "คลังไอเดีย",
  selected: "เลือกหัวข้อแล้ว",
  researching: "กำลังรีเสิร์ช",
  brief_ready: "บรีฟพร้อมใช้",
  drafting: "กำลังเขียนดราฟต์",
  review: "รอตรวจทาน",
  approved: "อนุมัติแล้ว",
  published: "เผยแพร่แล้ว"
};

const automationStatusLabel: Record<WorkflowAutomationStatus, string> = {
  queued: "รอคิว",
  running: "กำลังทำงาน",
  succeeded: "สำเร็จ",
  failed: "ต้องตรวจสอบ"
};

function formatStage(stage: WorkflowStage) {
  return stageLabels[stage];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function WorkflowDashboard() {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string>("");
  const [client, setClient] = useState("AquaCare Thailand");
  const [seedKeyword, setSeedKeyword] = useState("ปลาทอง");
  const [error, setError] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState("กำลังโหลดรายการงานคอนเทนต์...");
  const [isPending, startTransition] = useTransition();
  const job = jobs.find((item) => item.id === activeJobId) ?? jobs[0] ?? null;
  const latestEvent = job?.automationEvents?.[0];
  const fallbackEvents =
    job?.automationEvents?.filter((event) => event.payload?.fallback === "app").length ?? 0;
  const kpiCards = [
    {
      label: "ไอเดียที่สร้างได้",
      value: jobs.reduce((total, current) => total + current.ideas.length, 0).toString(),
      note: `มี ${jobs.length} งานอยู่ในระบบตอนนี้`
    },
    {
      label: "รีเสิร์ชพร้อมใช้",
      value: jobs.filter((current) => current.stage !== "idea_pool").length.toString(),
      note: "งานที่เลือกหัวข้อแล้วและมีรีเสิร์ชรองรับ"
    },
    {
      label: "ดราฟต์ที่กำลังเดินงาน",
      value: jobs.filter((current) => ["drafting", "review"].includes(current.stage)).length.toString(),
      note: "ดราฟต์ที่กำลังเข้าสู่ขั้นตรวจทาน"
    },
    {
      label: "สถานะอัตโนมัติ",
      value: latestEvent ? automationStatusLabel[latestEvent.status] : "ยังไม่เริ่ม",
      note: latestEvent
        ? `${latestEvent.type} อัปเดตเมื่อ ${formatDateTime(latestEvent.updatedAt)}`
        : "ยังไม่มีประวัติการทำงานอัตโนมัติ"
    }
  ];

  const loadJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("โหลดรายการงานไม่สำเร็จ");
      }

      const data = (await response.json()) as { jobs: WorkflowJob[] };
      setJobs(data.jobs);
      if (data.jobs[0]) {
        setActiveJobId((current) => current || data.jobs[0].id);
        setStatusMessage(`โหลดงานสำเร็จ ${data.jobs.length} รายการ`);
      } else {
        setStatusMessage("ยังไม่มีงานคอนเทนต์ เริ่มสร้างงานแรกจากฟอร์มด้านบนได้เลย");
      }
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดรายการงานไม่สำเร็จ");
      setStatusMessage("ไม่สามารถโหลดรายการงานคอนเทนต์ได้");
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
    setStatusMessage(successMessage ?? "อัปเดตงานคอนเทนต์แล้ว");
    setError("");
    return data.job;
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
          automation?: { accepted: boolean; message?: string; fallbackApplied?: boolean };
        };

        if (!response.ok) {
          throw new Error(data.error ?? "ส่งงานอัตโนมัติไม่สำเร็จ");
        }

        if (data.job) {
          const nextJob = data.job;
          setJobs((current) =>
            current.map((item) => (item.id === nextJob.id ? nextJob : item))
          );
          setActiveJobId(nextJob.id);
        } else {
          await loadJobs();
        }

        setError("");
        setStatusMessage(
          data.automation?.message
            ? `${type}: ${data.automation.message}`
            : `ส่ง ${type} เข้าคิวอัตโนมัติแล้ว`
        );
      } catch (automationError) {
        setError(
          automationError instanceof Error ? automationError.message : "ส่งงานอัตโนมัติไม่สำเร็จ"
        );
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
          `สร้างงานใหม่สำหรับ ${client} แล้ว`
        );
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "สร้างงานใหม่ไม่สำเร็จ");
      }
    });
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
        setError(actionError instanceof Error ? actionError.message : "อัปเดตงานไม่สำเร็จ");
      }
    });
  }

  if (!job) {
    return (
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>ระบบจัดการ SEO Content</span>
            <h1>สร้างงานแรกเพื่อเริ่ม workflow การทำคอนเทนต์ได้เลย</h1>
            <p>
              หน้าเดโมนี้ถูกออกแบบตาม flow ที่ลูกค้าต้องการ: รับ keyword, แตกหัวข้อ,
              เลือกหัวข้อที่ต้องการ, รีเสิร์ช, ทำบรีฟ และต่อไปยังดราฟต์บทความ
            </p>
            <form className={styles.intakeForm} onSubmit={handleCreateJob}>
              <label>
                ลูกค้า
                <input value={client} onChange={(event) => setClient(event.target.value)} />
              </label>
              <label>
                คีย์เวิร์ดตั้งต้น
                <input
                  value={seedKeyword}
                  onChange={(event) => setSeedKeyword(event.target.value)}
                />
              </label>
              <button className={styles.primaryButton} disabled={isPending} type="submit">
                {isPending ? "กำลังสร้าง..." : "สร้างงานแรก"}
              </button>
            </form>
            <p className={styles.statusText}>{error || statusMessage}</p>
          </div>
        </section>
      </main>
    );
  }

  const selectedIdea = job.ideas.find((idea) => idea.id === job.selectedIdeaId) ?? job.ideas[0];
  const readinessItems = [
    {
      label: "Idea shortlist",
      value: `${job.ideas.length} options`,
      note: "Client can compare article directions before any writing starts."
    },
    {
      label: "Research coverage",
      value: `${job.research.sources.length} sources`,
      note: "Thai and global source packs are combined into one view."
    },
    {
      label: "Delivery stage",
      value: formatStage(job.stage),
      note: "Every article stays traceable from keyword intake to draft."
    }
  ];
  const flowMoments = [
    {
      step: "01",
      title: "แตกคีย์เวิร์ดตั้งต้น",
      detail: "เปลี่ยน 1 คีย์เวิร์ดให้เป็นหลายโอกาสทำคอนเทนต์ พร้อม intent และมุมเล่น"
    },
    {
      step: "02",
      title: "Research before writing",
      detail: "Blend Thai and global inputs so the article is not just generic AI output."
    },
    {
      step: "03",
      title: "Approve the SEO brief",
      detail: "Lock title, outline, metadata, FAQs, and internal links before drafting."
    },
    {
      step: "04",
      title: "Draft and hand off",
      detail: "Generate the first article version, then hand it to editorial review and publishing."
    }
  ];
  const recentEvents = job.automationEvents?.slice(0, 4) ?? [];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>ระบบจัดการ SEO Content</span>
          <h1>เปลี่ยน 1 คีย์เวิร์ดให้กลายเป็นบทความพร้อมส่งลูกค้าแบบมีรีเสิร์ชรองรับ</h1>
          <p>
            หน้าเดโมนี้แสดงขั้นตอนจริงตั้งแต่แตกคีย์เวิร์ด, ให้ลูกค้าเลือกหัวข้อ,
            รีเสิร์ชไทยและต่างประเทศ, สร้าง SEO brief, เขียนดราฟต์ และต่อไปยังการเผยแพร่
          </p>
          <div className={styles.heroSignalRow}>
            <div className={styles.signalCard}>
              <span className={styles.panelLabel}>ภาพรวมเดโม</span>
              <strong>จากคีย์เวิร์ดสู่บทความ</strong>
              <p>ลูกค้าเห็น flow งานทั้งหมดได้ในหน้าเดียว</p>
            </div>
            <div className={styles.signalCard}>
              <span className={styles.panelLabel}>สถานะปัจจุบัน</span>
              <strong>{formatStage(job.stage)}</strong>
              <p>
                {latestEvent
                  ? `${latestEvent.type} อยู่ในสถานะ${automationStatusLabel[latestEvent.status].toLowerCase()}`
                  : "พร้อมเริ่ม automation แรก"}
              </p>
            </div>
            <div className={styles.signalCard}>
              <span className={styles.panelLabel}>โหมดอัตโนมัติ</span>
              <strong>{fallbackEvents > 0 ? "ใช้ fallback ในแอป" : "พร้อมเชื่อม n8n"}</strong>
              <p>
                {fallbackEvents > 0
                  ? "ระบบยังเดินงานต่อได้ แม้ n8n bridge ยังไม่พร้อม"
                  : "พร้อมต่อ webhook สำหรับรีเสิร์ช บรีฟ ดราฟต์ และเผยแพร่"}
              </p>
            </div>
          </div>
          <form className={styles.intakeForm} onSubmit={handleCreateJob}>
            <div className={styles.formGrid}>
              <label>
                ลูกค้า
                <input value={client} onChange={(event) => setClient(event.target.value)} />
              </label>
              <label>
                คีย์เวิร์ดตั้งต้น
                <input
                  value={seedKeyword}
                  onChange={(event) => setSeedKeyword(event.target.value)}
                />
              </label>
            </div>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton} disabled={isPending} type="submit">
                {isPending ? "กำลังสร้าง..." : "สร้างงานใหม่"}
              </button>
              <button className={styles.secondaryButton} type="button" onClick={() => void loadJobs()}>
                รีเฟรชงาน
              </button>
            </div>
          </form>
          <p className={styles.statusText}>{error || statusMessage}</p>
        </div>
        <aside className={styles.heroPanel}>
          <p className={styles.panelLabel}>งานของลูกค้าปัจจุบัน</p>
          <div className={styles.jobPicker}>
            {jobs.map((item) => (
              <button
                key={item.id}
                className={`${styles.jobChip} ${item.id === job.id ? styles.jobChipActive : ""}`}
                onClick={() => setActiveJobId(item.id)}
                type="button"
              >
                {item.client}
              </button>
            ))}
          </div>
          <strong>{job.client}</strong>
          <span className={styles.seedKeyword}>คีย์เวิร์ดตั้งต้น: {job.seedKeyword}</span>
          <div className={styles.stagePill}>{formatStage(job.stage)}</div>
          <ul className={styles.miniChecklist}>
            <li>แตกคีย์เวิร์ดเป็นชุดหัวข้อพร้อมให้เลือก</li>
            <li>เลือกทิศทางบทความที่ตรงกับลูกค้าแล้ว</li>
            <li>รีเสิร์ชรวมทั้งไทยและต่างประเทศแล้ว</li>
            <li>พร้อมส่งต่อไปยังขั้นบรีฟและดราฟต์</li>
          </ul>
          <div className={styles.heroPanelBlock}>
            <span className={styles.infoLabel}>ความพร้อมของระบบ</span>
            <div className={styles.readinessStack}>
              {readinessItems.map((item) => (
                <article key={item.label} className={styles.readinessItem}>
                  <div>
                    <span className={styles.panelLabel}>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </div>
          <div className={styles.eventSummary}>
            <span className={styles.infoLabel}>เหตุการณ์อัตโนมัติล่าสุด</span>
            <ul className={styles.eventList}>
              {recentEvents.map((event) => (
                <li key={event.id} className={styles.eventItem}>
                  <span className={styles.eventType}>{event.type}</span>
                  <span
                    className={`${styles.eventStatus} ${
                      event.status === "failed" ? styles.eventStatusFailed : ""
                    }`}
                  >
                    {automationStatusLabel[event.status]}
                  </span>
                </li>
              ))}
              {!job.automationEvents?.length ? (
                <li className={styles.eventEmpty}>ยังไม่มีการทำงานอัตโนมัติ</li>
              ) : null}
            </ul>
          </div>
        </aside>
      </section>

      <section className={styles.kpiGrid}>
        {kpiCards.map((card) => (
          <article key={card.label} className={styles.kpiCard}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.note}</p>
          </article>
        ))}
      </section>

      <section className={styles.storySection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>แนวทางนำเสนอ</span>
            <h2>สิ่งที่ลูกค้าจะเข้าใจได้ภายในไม่กี่นาที</h2>
          </div>
          <p>
            โครงนี้ถูกจัดให้เล่า value ของระบบก่อน: เลือกหัวข้อ, ตรวจรีเสิร์ช, อนุมัติบรีฟ
            และดูดราฟต์บทความในลำดับที่เข้าใจง่าย
          </p>
        </div>
        <div className={styles.storyGrid}>
          {flowMoments.map((moment) => (
            <article key={moment.step} className={styles.storyCard}>
              <span className={styles.storyStep}>{moment.step}</span>
              <h3>{moment.title}</h3>
              <p>{moment.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.pipelineSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>ภาพรวมการทำงาน</span>
            <h2>workflow สำหรับทำงานจริงกับลูกค้า</h2>
          </div>
          <p>
            คนยังเป็นผู้ตัดสินใจในจุดสำคัญ ส่วนระบบช่วยเร่งงานซ้ำๆ ระหว่างรีเสิร์ช บรีฟ
            ดราฟต์ และการเผยแพร่
          </p>
        </div>
        <div className={styles.stageRail}>
          {workflowStages.map((stage) => {
            const active = stage.key === job.stage;
            return (
              <div
                key={stage.key}
                className={`${styles.stageNode} ${active ? styles.stageNodeActive : ""}`}
              >
                <span>{stage.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.eyebrow}>Step 1</span>
              <h3>Keyword expansion</h3>
            </div>
            <button
              className={styles.textButton}
              onClick={() => void loadJobs()}
              type="button"
            >
                โหลดงานใหม่
            </button>
          </div>
          <p className={styles.cardLead}>
            เริ่มจากคีย์เวิร์ดตั้งต้น แล้วแตกเป็นหัวข้อบทความที่ลูกค้าเลือกได้จริง
          </p>
          <div className={styles.selectionSnapshot}>
            <div>
              <span className={styles.infoLabel}>หัวข้อที่เลือกตอนนี้</span>
              <strong>{selectedIdea.title}</strong>
            </div>
            <p>{selectedIdea.whyItMatters}</p>
          </div>
          <div className={styles.seedBox}>
            <label htmlFor="seedKeyword">คีย์เวิร์ดตั้งต้น</label>
            <input id="seedKeyword" value={job.seedKeyword} readOnly />
          </div>
          <div className={styles.ideaList}>
            {job.ideas.map((idea) => {
              const selected = idea.id === job.selectedIdeaId;
              return (
                <button
                  key={idea.id}
                  type="button"
                  onClick={() =>
                    updateJob(
                      `/api/jobs/${job.id}/ideas/select`,
                      `Selected "${idea.title}" for ${job.client}.`,
                      { ideaId: idea.id }
                    )
                  }
                  className={`${styles.ideaCard} ${selected ? styles.ideaCardSelected : ""}`}
                  disabled={isPending}
                >
                  <div className={styles.ideaMeta}>
                    <span>{idea.searchIntent}</span>
                    <span>{idea.difficulty}</span>
                    <span>{idea.confidence}% fit</span>
                  </div>
                  <strong>{idea.title}</strong>
                  <p>{idea.angle}</p>
                </button>
              );
            })}
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.eyebrow}>Step 2</span>
              <h3>ชุดรีเสิร์ช</h3>
            </div>
            <div className={styles.inlineActions}>
              <button
                className={styles.textButton}
                onClick={() =>
                  updateJob(`/api/jobs/${job.id}/research`, `อัปเดตรีเสิร์ชสำหรับ ${job.client} แล้ว`)
                }
                type="button"
              >
                สร้างในระบบ
              </button>
              <button
                className={styles.textButton}
                onClick={() => void runAutomation("research")}
                type="button"
              >
                ส่งเข้า n8n
              </button>
            </div>
          </div>
          <p className={styles.cardLead}>{job.research.objective}</p>
          <div className={styles.highlightBanner}>
            <span>Research mode</span>
            <strong>TH + Global source blend</strong>
            <p>Designed to give the client confidence before the writing phase starts.</p>
          </div>
          <div className={styles.infoGrid}>
            <div>
              <span className={styles.infoLabel}>Audience</span>
              <p>{job.research.audience}</p>
            </div>
            <div>
              <span className={styles.infoLabel}>Client-selected angle</span>
              <p>{selectedIdea.angle}</p>
            </div>
          </div>
          <div className={styles.dualColumn}>
            <div>
              <span className={styles.infoLabel}>Opportunity gaps</span>
              <ul className={styles.bulletList}>
                {job.research.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className={styles.infoLabel}>Related keywords</span>
              <div className={styles.tagWrap}>
                {selectedIdea.relatedKeywords.map((keyword) => (
                  <span key={keyword} className={styles.tag}>
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.sourceStack}>
            {job.research.sources.map((source) => (
              <div key={`${source.region}-${source.title}`} className={styles.sourceCard}>
                <div className={styles.sourceHead}>
                  <span className={styles.regionBadge}>{source.region}</span>
                  <strong>{source.title}</strong>
                </div>
                <span className={styles.sourceName}>{source.source}</span>
                <p>{source.insight}</p>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.eyebrow}>Step 3</span>
              <h3>SEO content brief</h3>
            </div>
            <div className={styles.inlineActions}>
              <button
                className={styles.textButton}
                onClick={() =>
                  updateJob(`/api/jobs/${job.id}/brief`, `Brief generated for ${job.client}.`)
                }
                type="button"
              >
                สร้างในระบบ
              </button>
              <button
                className={styles.textButton}
                onClick={() => void runAutomation("brief")}
                type="button"
              >
                ส่งเข้า n8n
              </button>
            </div>
          </div>
          <div className={styles.briefHeader}>
            <h4>{job.brief.title}</h4>
            <p>{job.brief.angle}</p>
          </div>
          <div className={styles.selectionSnapshot}>
            <div>
              <span className={styles.infoLabel}>Editorial audience</span>
              <strong>{job.brief.audience}</strong>
            </div>
            <p>The brief locks the article direction before anyone spends time editing the draft.</p>
          </div>
          <div className={styles.metaPanel}>
            <div>
              <span className={styles.infoLabel}>Meta title</span>
              <p>{job.brief.metaTitle}</p>
            </div>
            <div>
              <span className={styles.infoLabel}>Meta description</span>
              <p>{job.brief.metaDescription}</p>
            </div>
            <div>
              <span className={styles.infoLabel}>Slug</span>
              <p>/{job.brief.slug}</p>
            </div>
          </div>
          <div className={styles.dualColumn}>
            <div>
              <span className={styles.infoLabel}>Outline</span>
              <ol className={styles.orderedList}>
                {job.brief.outline.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
            <div>
              <span className={styles.infoLabel}>FAQs</span>
              <ul className={styles.bulletList}>
                {job.brief.faqs.map((faq) => (
                  <li key={faq}>{faq}</li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <span className={styles.infoLabel}>Internal links to include</span>
            <div className={styles.tagWrap}>
              {job.brief.internalLinks.map((item) => (
                <span key={item} className={styles.tag}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </article>

        <article className={`${styles.card} ${styles.fullWidth}`}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.eyebrow}>Step 4</span>
              <h3>พื้นที่ดราฟต์บทความ</h3>
            </div>
            <div className={styles.heroActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => void runAutomation("draft")}
                type="button"
              >
                Queue Draft in n8n
              </button>
              <button
                className={styles.primaryButton}
                onClick={() =>
                  updateJob(`/api/jobs/${job.id}/draft`, `Draft refreshed for ${job.client}.`)
                }
                type="button"
              >
                Generate draft
              </button>
            </div>
          </div>
          <div className={styles.editorShell}>
            <div className={styles.editorBody}>
              <p className={styles.editorIntro}>{job.draft.intro}</p>
              {job.draft.sections.map((section) => (
                <section key={section.heading} className={styles.articleSection}>
                  <h4>{section.heading}</h4>
                  <p>{section.body}</p>
                </section>
              ))}
              <p className={styles.editorConclusion}>{job.draft.conclusion}</p>
            </div>
            <aside className={styles.heroPanel}>
              <span className={styles.infoLabel}>จุดตรวจของ automation</span>
              <ul className={styles.bulletList}>
                  <li>n8n หรือระบบในแอปช่วยพางานไปขั้นถัดไปได้</li>
                  <li>ข้อมูลรีเสิร์ชยังผูกอยู่กับงานก่อนเข้าสู่ดราฟต์</li>
                  <li>ขั้นเผยแพร่ยังสามารถผูกกับการอนุมัติได้</li>
                  <li>ผลลัพธ์ทุกครั้งถูกบันทึกไว้ใน event log</li>
              </ul>
              <div className={styles.inlineActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => void runAutomation("publish")}
                  type="button"
                >
                  ส่งเผยแพร่เข้า n8n
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => void loadJobs()}
                  type="button"
                >
                  รีเฟรช event
                </button>
              </div>
              <div className={styles.eventPanel}>
                <strong>ประวัติการทำงานของ workflow</strong>
                <ul className={styles.eventTimeline}>
                  {(job.automationEvents ?? []).map((event) => (
                    <li key={event.id} className={styles.timelineItem}>
                      <div className={styles.timelineTop}>
                        <span className={styles.eventType}>{event.type}</span>
                        <span
                          className={`${styles.eventStatus} ${
                            event.status === "failed" ? styles.eventStatusFailed : ""
                          }`}
                        >
                          {automationStatusLabel[event.status]}
                        </span>
                        <span className={styles.panelLabel}>{event.source}</span>
                      </div>
                      <p>{event.message ?? "No message from automation yet."}</p>
                      <span className={styles.timelineTime}>{formatDateTime(event.updatedAt)}</span>
                    </li>
                  ))}
                  {!job.automationEvents?.length ? (
                    <li className={styles.eventEmpty}>Queue a workflow to start tracking automation runs.</li>
                  ) : null}
                </ul>
              </div>
              <div className={styles.sourceCard}>
                <strong>ขั้นต่อไปที่แนะนำ</strong>
                <p>
                  เก็บงานฝั่ง n8n bridge ให้สมบูรณ์ แล้วเพิ่มปุ่มอนุมัติและเผยแพร่
                  WordPress บน flow เดียวกันนี้ต่อได้ทันที
                </p>
              </div>
            </aside>
          </div>
        </article>
      </section>
    </main>
  );
}
