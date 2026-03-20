"use client";

import { type FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import { workflowStages } from "@/data/mock-workflow";
import {
  type WorkflowAutomationStatus,
  type WorkflowAutomationType,
  type WorkflowJob,
  type WorkflowStage
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
  informational: "หาความรู้",
  commercial: "เชิงซื้อ",
  "problem-solving": "แก้ปัญหา"
} as const;

const difficultyLabels = {
  low: "ง่าย",
  medium: "กลาง",
  high: "ยาก"
} as const;

function formatStage(stage: WorkflowStage) {
  return stageLabels[stage];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function WorkflowDashboard() {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [activeJobId, setActiveJobId] = useState("");
  const [client, setClient] = useState("AquaCare Thailand");
  const [seedKeyword, setSeedKeyword] = useState("ปลาทอง");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("กำลังโหลดรายการงานคอนเทนต์...");
  const [isPending, startTransition] = useTransition();

  const job = jobs.find((item) => item.id === activeJobId) ?? jobs[0] ?? null;
  const selectedIdea = job?.ideas.find((idea) => idea.id === job.selectedIdeaId) ?? job?.ideas[0] ?? null;
  const latestEvent = job?.automationEvents?.[0];
  const fallbackEvents =
    job?.automationEvents?.filter((event) => event.payload?.fallback === "app").length ?? 0;
  const recentEvents = job?.automationEvents?.slice(0, 4) ?? [];

  const kpiCards = [
    {
      label: "จำนวนหัวข้อที่สร้างได้",
      value: jobs.reduce((total, current) => total + current.ideas.length, 0).toString(),
      note: `มี ${jobs.length} งานอยู่ในระบบตอนนี้`
    },
    {
      label: "งานที่พ้นขั้นเลือกหัวข้อ",
      value: jobs.filter((current) => current.stage !== "idea_pool").length.toString(),
      note: "พร้อมนำไปต่อยอดเป็นรีเสิร์ช บรีฟ และดราฟต์"
    },
    {
      label: "งานที่เข้าโหมดเขียนแล้ว",
      value: jobs.filter((current) => ["drafting", "review"].includes(current.stage)).length.toString(),
      note: "ใช้เป็นตัวชี้ว่าทีมเริ่มมีคอนเทนต์พร้อมตรวจ"
    },
    {
      label: "สถานะ automation ล่าสุด",
      value: latestEvent ? automationStatusLabels[latestEvent.status] : "ยังไม่เริ่ม",
      note: latestEvent
        ? `${automationTypeLabels[latestEvent.type]} อัปเดตเมื่อ ${formatDateTime(latestEvent.updatedAt)}`
        : "ยังไม่มีประวัติการทำงานอัตโนมัติ"
    }
  ];

  const readinessItems = job
    ? [
        {
          label: "จำนวนตัวเลือกหัวข้อ",
          value: `${job.ideas.length} หัวข้อ`,
          note: "ลูกค้าเลือกมุมบทความก่อนเขียนจริงได้"
        },
        {
          label: "แหล่งข้อมูลรีเสิร์ช",
          value: `${job.research.sources.length} แหล่ง`,
          note: "รวมข้อมูลไทยและต่างประเทศในมุมมองเดียว"
        },
        {
          label: "สถานะงานปัจจุบัน",
          value: formatStage(job.stage),
          note: "ติดตามงานจาก keyword ถึง draft ได้ครบ"
        }
      ]
    : [];

  const flowMoments = [
    {
      step: "01",
      title: "แตก seed keyword เป็นหลายไอเดีย",
      detail: "เริ่มจากคีย์เวิร์ดเดียว แล้วแตกเป็นหัวข้อพร้อม intent และมุมเล่นให้ลูกค้าเลือก"
    },
    {
      step: "02",
      title: "รีเสิร์ชก่อนเขียน",
      detail: "รวมข้อมูลไทยและต่างประเทศเพื่อกันบทความ AI ที่กว้างเกินและไม่มีหลักฐานรองรับ"
    },
    {
      step: "03",
      title: "ล็อกบรีฟให้ชัดก่อนสร้างดราฟต์",
      detail: "กำหนด title, outline, meta, FAQ และ internal links ก่อนใช้เวลาแก้บทความ"
    },
    {
      step: "04",
      title: "ส่งต่อดราฟต์และเตรียมเผยแพร่",
      detail: "สร้างดราฟต์แรก ตรวจทาน แล้วต่อเข้าระบบ publish หรือ WordPress ภายหลังได้"
    }
  ];

  const loadJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const data = (await response.json()) as { error?: string; jobs?: WorkflowJob[] };

      if (!response.ok || !data.jobs) {
        throw new Error(data.error ?? "โหลดรายการงานไม่สำเร็จ");
      }

      setJobs(data.jobs);
      setActiveJobId((current) => current || data.jobs[0]?.id || "");
      setStatusMessage(
        data.jobs.length > 0
          ? `โหลดงานสำเร็จ ${data.jobs.length} รายการ`
          : "ยังไม่มีงานคอนเทนต์ เริ่มสร้างงานแรกจากฟอร์มด้านบนได้เลย"
      );
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

    setJobs((current) =>
      current.some((item) => item.id === data.job!.id)
        ? current.map((item) => (item.id === data.job!.id ? data.job! : item))
        : [data.job!, ...current]
    );
    setActiveJobId(data.job.id);
    setStatusMessage(successMessage ?? "อัปเดตงานเรียบร้อย");
    setError("");
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
          automation?: {
            accepted: boolean;
            message?: string;
            fallbackApplied?: boolean;
          };
        };

        if (!response.ok) {
          throw new Error(data.error ?? "ส่งงานเข้า automation ไม่สำเร็จ");
        }

        if (data.job) {
          setJobs((current) => current.map((item) => (item.id === data.job!.id ? data.job! : item)));
          setActiveJobId(data.job.id);
        } else {
          await loadJobs();
        }

        setError("");
        setStatusMessage(
          data.automation?.message
            ? `${automationTypeLabels[type]}: ${data.automation.message}`
            : `ส่ง${automationTypeLabels[type]}เข้า automation แล้ว`
        );
      } catch (automationError) {
        setError(
          automationError instanceof Error
            ? automationError.message
            : "ส่งงานเข้า automation ไม่สำเร็จ"
        );
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
          `สร้างงานใหม่สำหรับ ${client} เรียบร้อยแล้ว`
        );
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "สร้างงานใหม่ไม่สำเร็จ");
      }
    });
  }

  if (!job || !selectedIdea) {
    return (
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>SEO Content Workflow</span>
            <h1>เริ่มสร้างงานแรกเพื่อเดโม flow การผลิตบทความ SEO</h1>
            <p>
              หน้าเดโมนี้ออกแบบตาม workflow ที่ลูกค้าต้องการ: รับ keyword, แตกไอเดีย,
              ให้ลูกค้าเลือกหัวข้อ, รีเสิร์ช, ทำบรีฟ และสร้างดราฟต์บทความต่อในระบบเดียว
            </p>
            <form className={styles.intakeForm} onSubmit={handleCreateJob}>
              <div className={styles.formGrid}>
                <label>
                  ชื่อลูกค้า
                  <input value={client} onChange={(event) => setClient(event.target.value)} />
                </label>
                <label>
                  Seed keyword
                  <input
                    value={seedKeyword}
                    onChange={(event) => setSeedKeyword(event.target.value)}
                  />
                </label>
              </div>
              <div className={styles.heroActions}>
                <button className={styles.primaryButton} disabled={isPending} type="submit">
                  {isPending ? "กำลังสร้าง..." : "สร้างงานแรก"}
                </button>
              </div>
            </form>
            <p className={styles.statusText}>{error || statusMessage}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>SEO Content Workflow</span>
          <h1>เปลี่ยน 1 keyword ให้กลายเป็นบทความพร้อมส่งลูกค้าแบบมีรีเสิร์ชรองรับ</h1>
          <p>
            หน้านี้เล่า flow จริงตั้งแต่แตกคีย์เวิร์ด ให้ลูกค้าเลือกหัวข้อ รีเสิร์ชข้อมูลไทยและต่างประเทศ
            ทำบรีฟ SEO และต่อยอดเป็นดราฟต์บทความในระบบเดียว
          </p>

          <div className={styles.heroSignalRow}>
            <div className={styles.signalCard}>
              <span className={styles.panelLabel}>มุมเดโม</span>
              <strong>จาก keyword สู่ draft</strong>
              <p>ลูกค้าเห็นภาพการทำงานครบทั้ง pipeline ภายในหน้าเดียว</p>
            </div>
            <div className={styles.signalCard}>
              <span className={styles.panelLabel}>สถานะงานล่าสุด</span>
              <strong>{formatStage(job.stage)}</strong>
              <p>
                {latestEvent
                  ? `${automationTypeLabels[latestEvent.type]} อยู่ในสถานะ ${automationStatusLabels[latestEvent.status]}`
                  : "พร้อมเริ่ม automation แรก"}
              </p>
            </div>
            <div className={styles.signalCard}>
              <span className={styles.panelLabel}>โหมดระบบ</span>
              <strong>{fallbackEvents > 0 ? "มี fallback ในแอป" : "พร้อมเชื่อม n8n"}</strong>
              <p>
                {fallbackEvents > 0
                  ? "ถ้า n8n ยังไม่พร้อม ระบบยังเดินงานต่อได้เพื่อใช้เดโมและทำงานภายใน"
                  : "พร้อมยิง workflow ไปยัง n8n สำหรับรีเสิร์ช บรีฟ ดราฟต์ และเผยแพร่"}
              </p>
            </div>
          </div>

          <form className={styles.intakeForm} onSubmit={handleCreateJob}>
            <div className={styles.formGrid}>
              <label>
                ชื่อลูกค้า
                <input value={client} onChange={(event) => setClient(event.target.value)} />
              </label>
              <label>
                Seed keyword
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
              <button className={styles.secondaryButton} onClick={() => void loadJobs()} type="button">
                รีเฟรชรายการงาน
              </button>
            </div>
          </form>

          <p className={styles.statusText}>{error || statusMessage}</p>
        </div>

        <aside className={styles.heroPanel}>
          <div className={styles.heroPanelBlock}>
            <span className={styles.panelLabel}>งานที่กำลังดู</span>
            <strong>{job.client}</strong>
            <span className={styles.seedKeyword}>{job.seedKeyword}</span>
          </div>

          <div className={styles.heroPanelBlock}>
            <span className={styles.panelLabel}>เลือกงานเพื่อเดโม</span>
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
          </div>

          <div className={styles.heroPanelBlock}>
            <span className={styles.panelLabel}>ความพร้อมของงาน</span>
            <div className={styles.readinessStack}>
              {readinessItems.map((item) => (
                <article key={item.label} className={styles.readinessItem}>
                  <span className={styles.infoLabel}>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.eventSummary}>
            <span className={styles.infoLabel}>เหตุการณ์ล่าสุด</span>
            <ul className={styles.eventList}>
              {recentEvents.map((event) => (
                <li key={event.id} className={styles.eventItem}>
                  <span className={styles.eventType}>{automationTypeLabels[event.type]}</span>
                  <span
                    className={`${styles.eventStatus} ${
                      event.status === "failed" ? styles.eventStatusFailed : ""
                    }`}
                  >
                    {automationStatusLabels[event.status]}
                  </span>
                </li>
              ))}
              {recentEvents.length === 0 ? (
                <li className={styles.eventEmpty}>ยังไม่มีประวัติการทำงานอัตโนมัติ</li>
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
            <span className={styles.eyebrow}>ภาพรวมการนำเสนอ</span>
            <h2>สิ่งที่ลูกค้าจะเข้าใจได้เร็วจากเดโมชุดนี้</h2>
          </div>
          <p>
            โครงนี้ออกแบบให้เล่า value ก่อน ไม่ใช่โชว์เทคนิคอย่างเดียว ลูกค้าจะเห็นว่าเลือกหัวข้อได้,
            มีรีเสิร์ชรองรับ, อนุมัติบรีฟได้ และดูกระบวนการสร้างดราฟต์ต่อได้ทันที
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
            <span className={styles.eyebrow}>ภาพรวม workflow</span>
            <h2>ติดตามงานจาก intake ถึง publish ได้ในลำดับเดียว</h2>
          </div>
          <p>
            คนยังเป็นผู้ตัดสินใจในจุดสำคัญ ส่วนระบบจะช่วยเร่งขั้นแตกไอเดีย รีเสิร์ช ทำบรีฟ เขียนดราฟต์
            และต่อเข้าระบบเผยแพร่ภายหลัง
          </p>
        </div>
        <div className={styles.stageRail}>
          {workflowStages.map((stage) => (
            <div
              key={stage.key}
              className={`${styles.stageNode} ${stage.key === job.stage ? styles.stageNodeActive : ""}`}
            >
              <span>{stage.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.eyebrow}>Step 1</span>
              <h3>แตกคีย์เวิร์ดเป็นหัวข้อ</h3>
            </div>
            <button className={styles.textButton} onClick={() => void loadJobs()} type="button">
              โหลดข้อมูลใหม่
            </button>
          </div>
          <p className={styles.cardLead}>
            เริ่มจาก seed keyword แล้วแตกเป็นหัวข้อที่ลูกค้าเลือกได้จริง พร้อมดู intent และความยากของแต่ละหัวข้อ
          </p>
          <div className={styles.selectionSnapshot}>
            <div>
              <span className={styles.infoLabel}>หัวข้อที่เลือกอยู่ตอนนี้</span>
              <strong>{selectedIdea.title}</strong>
            </div>
            <p>{selectedIdea.whyItMatters}</p>
          </div>
          <div className={styles.seedBox}>
            <label htmlFor="seedKeywordValue">Seed keyword</label>
            <input id="seedKeywordValue" readOnly value={job.seedKeyword} />
          </div>
          <div className={styles.ideaList}>
            {job.ideas.map((idea) => {
              const isSelected = idea.id === job.selectedIdeaId;

              return (
                <button
                  key={idea.id}
                  className={`${styles.ideaCard} ${isSelected ? styles.ideaCardSelected : ""}`}
                  disabled={isPending}
                  onClick={() =>
                    updateJob(
                      `/api/jobs/${job.id}/ideas/select`,
                      `เลือกหัวข้อ "${idea.title}" สำหรับ ${job.client} แล้ว`,
                      { ideaId: idea.id }
                    )
                  }
                  type="button"
                >
                  <div className={styles.ideaMeta}>
                    <span>{searchIntentLabels[idea.searchIntent]}</span>
                    <span>ความยาก {difficultyLabels[idea.difficulty]}</span>
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
              <button className={styles.textButton} onClick={() => void runAutomation("research")} type="button">
                ส่งเข้า n8n
              </button>
            </div>
          </div>
          <p className={styles.cardLead}>{job.research.objective}</p>
          <div className={styles.highlightBanner}>
            <span>Research mode</span>
            <strong>TH + Global source blend</strong>
            <p>ออกแบบให้ลูกค้ามั่นใจว่าบทความไม่ได้สร้างจาก AI แบบลอยๆ โดยไม่มีฐานข้อมูลรองรับ</p>
          </div>
          <div className={styles.infoGrid}>
            <div>
              <span className={styles.infoLabel}>กลุ่มเป้าหมาย</span>
              <p>{job.research.audience}</p>
            </div>
            <div>
              <span className={styles.infoLabel}>มุมที่เลือกไว้</span>
              <p>{selectedIdea.angle}</p>
            </div>
          </div>
          <div className={styles.dualColumn}>
            <div>
              <span className={styles.infoLabel}>ช่องว่างที่ควรเก็บในบทความ</span>
              <ul className={styles.bulletList}>
                {job.research.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className={styles.infoLabel}>คีย์เวิร์ดที่เกี่ยวข้อง</span>
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
                  updateJob(`/api/jobs/${job.id}/brief`, `สร้างบรีฟสำหรับ ${job.client} แล้ว`)
                }
                type="button"
              >
                สร้างในระบบ
              </button>
              <button className={styles.textButton} onClick={() => void runAutomation("brief")} type="button">
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
              <span className={styles.infoLabel}>กลุ่มผู้อ่านของบทความ</span>
              <strong>{job.brief.audience}</strong>
            </div>
            <p>ขั้นนี้ช่วยล็อกทิศทางบทความก่อนให้ทีมใช้เวลาแก้ดราฟต์จริง</p>
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
              <span className={styles.infoLabel}>FAQ ที่แนะนำ</span>
              <ul className={styles.bulletList}>
                {job.brief.faqs.map((faq) => (
                  <li key={faq}>{faq}</li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <span className={styles.infoLabel}>Internal links ที่ควรเชื่อม</span>
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
              <button className={styles.secondaryButton} onClick={() => void runAutomation("draft")} type="button">
                ส่งดราฟต์เข้า n8n
              </button>
              <button
                className={styles.primaryButton}
                onClick={() => updateJob(`/api/jobs/${job.id}/draft`, `อัปเดตดราฟต์สำหรับ ${job.client} แล้ว`)}
                type="button"
              >
                สร้างดราฟต์ในระบบ
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
              <span className={styles.infoLabel}>สถานะงานอัตโนมัติ</span>
              <ul className={styles.bulletList}>
                <li>ต่อเข้า n8n ได้เมื่อ workflow ฝั่ง automation พร้อมจริง</li>
                <li>ถ้า webhook มีปัญหา ระบบยังเดินงานต่อด้วย in-app fallback ได้</li>
                <li>ทุกครั้งที่รันจะมี event log เก็บสถานะไว้ตรวจย้อนหลัง</li>
                <li>ขั้น publish ยังต่อ WordPress เพิ่มได้ใน phase ถัดไป</li>
              </ul>
              <div className={styles.inlineActions}>
                <button className={styles.secondaryButton} onClick={() => void runAutomation("publish")} type="button">
                  ส่งเผยแพร่เข้า n8n
                </button>
                <button className={styles.secondaryButton} onClick={() => void loadJobs()} type="button">
                  รีเฟรช event
                </button>
              </div>
              <div className={styles.eventPanel}>
                <strong>ประวัติการทำงานของ workflow</strong>
                <ul className={styles.eventTimeline}>
                  {(job.automationEvents ?? []).map((event) => (
                    <li key={event.id} className={styles.timelineItem}>
                      <div className={styles.timelineTop}>
                        <span className={styles.eventType}>{automationTypeLabels[event.type]}</span>
                        <span
                          className={`${styles.eventStatus} ${
                            event.status === "failed" ? styles.eventStatusFailed : ""
                          }`}
                        >
                          {automationStatusLabels[event.status]}
                        </span>
                        <span className={styles.panelLabel}>{event.source}</span>
                      </div>
                      <p>{event.message ?? "ยังไม่มีข้อความสถานะจากระบบ"}</p>
                      <span className={styles.timelineTime}>{formatDateTime(event.updatedAt)}</span>
                    </li>
                  ))}
                  {!job.automationEvents?.length ? (
                    <li className={styles.eventEmpty}>ยังไม่มีการรัน workflow สำหรับงานนี้</li>
                  ) : null}
                </ul>
              </div>
              <div className={styles.sourceCard}>
                <strong>ขั้นต่อไปที่แนะนำ</strong>
                <p>
                  หลังเดโม flow นี้นิ่งแล้ว ค่อยเพิ่มปุ่มอนุมัติและส่งต่อ publish ไปยัง WordPress
                  ในหน้าเดียวกันได้ทันที
                </p>
              </div>
            </aside>
          </div>
        </article>
      </section>
    </main>
  );
}
