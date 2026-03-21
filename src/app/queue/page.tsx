import Link from "next/link";
import { ConsoleNav } from "@/components/console-nav";
import styles from "@/components/console-pages.module.css";
import { listJobs } from "@/lib/job-store";
import type { WorkflowAutomationType } from "@/types/workflow";

const statusLabels = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed"
} as const;

function getResumeTab(type: WorkflowAutomationType) {
  if (type === "research") return "research";
  if (type === "publish") return "queue";
  return "article";
}

export default async function QueuePage() {
  const jobs = await listJobs();
  const rows = jobs
    .flatMap((job) =>
      (job.automationEvents ?? []).map((event) => ({
        id: event.id,
        jobId: job.id,
        project: job.client,
        keyword: job.seedKeyword,
        type: event.type,
        status: event.status,
        source: event.source,
        updatedAt: event.updatedAt,
        message: event.message ?? "No detail"
      }))
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return (
    <main className={styles.page}>
      <ConsoleNav />

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Queue</span>
        <h1 className={styles.title}>Track automation status across every content job</h1>
        <p className={styles.description}>
          ดูได้ทันทีว่างานไหนกำลังคิว งานไหนสำเร็จ งานไหนล้มเหลว และระบบไหนเป็นคนรัน เพื่อแก้ปัญหาได้เร็วขึ้นเวลาทำงานจริง
        </p>
      </section>

      <section className={styles.metrics}>
        <article className={styles.metricCard}>
          <span>Total events</span>
          <strong>{rows.length}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Queued / Running</span>
          <strong>{rows.filter((row) => row.status === "queued" || row.status === "running").length}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Succeeded</span>
          <strong>{rows.filter((row) => row.status === "succeeded").length}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Failed</span>
          <strong>{rows.filter((row) => row.status === "failed").length}</strong>
        </article>
      </section>

      {rows.length > 0 ? (
        <section className={styles.table}>
          <div className={styles.tableHead}>
            <span>Project</span>
            <span>Keyword</span>
            <span>Action</span>
            <span>Status</span>
            <span>Updated</span>
          </div>
          {rows.map((row) => (
            <div key={row.id} className={styles.tableRow}>
              <div>
                <strong>{row.project}</strong>
                <small>{row.source.toUpperCase()}</small>
              </div>
              <div>
                <strong>{row.keyword}</strong>
                <small>{row.message}</small>
              </div>
              <div>
                <strong>{row.type}</strong>
              </div>
              <div>
                <strong>{statusLabels[row.status]}</strong>
              </div>
              <div>
                <strong>{new Date(row.updatedAt).toLocaleString("th-TH")}</strong>
                <div className={styles.actions}>
                  <Link className={styles.linkButton} href={`/articles?job=${row.jobId}`}>
                    Open
                  </Link>
                  <Link className={styles.linkButton} href={`/?job=${row.jobId}&tab=${getResumeTab(row.type)}`}>
                    Resume
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className={styles.emptyState}>
          <strong>ยังไม่มี queue event</strong>
          <p className={styles.muted}>เมื่อเริ่มรัน research, draft หรือ publish งานจะเริ่มเข้ามาแสดงในหน้านี้</p>
          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/">
              Open workflow
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
