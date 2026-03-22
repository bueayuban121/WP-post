import Link from "next/link";
import { ConsoleNav } from "@/components/console-nav";
import styles from "@/components/console-pages.module.css";
import { QueueTableClient } from "@/components/queue-table-client";
import { listJobs } from "@/lib/job-store";
import { getJobScopeForUser, requirePageSession } from "@/lib/auth";

function buildQueueMessage(payload: Record<string, unknown> | undefined, fallback: string) {
  const parts: string[] = [fallback];
  const wordpress = payload?.wordpress as Record<string, unknown> | undefined;
  const provider =
    typeof payload?.provider === "string"
      ? payload.provider
      : typeof wordpress?.provider === "string"
        ? wordpress.provider
        : "";
  const uploadedMediaCount =
    typeof payload?.uploadedMediaCount === "number"
      ? payload.uploadedMediaCount
      : typeof wordpress?.uploadedMediaCount === "number"
        ? wordpress.uploadedMediaCount
        : undefined;
  const uploadErrors =
    (Array.isArray(payload?.uploadErrors) ? payload.uploadErrors : undefined) ??
    (Array.isArray(wordpress?.uploadErrors) ? wordpress.uploadErrors : undefined);

  if (provider) {
    parts.push(`Provider: ${provider}`);
  }

  if (typeof uploadedMediaCount === "number") {
    parts.push(`Media uploaded: ${uploadedMediaCount}`);
  }

  if (uploadErrors && uploadErrors.length > 0) {
    parts.push(`Upload issues: ${uploadErrors.length}`);
  }

  return parts.filter(Boolean).join(" · ");
}

export default async function QueuePage() {
  const user = await requirePageSession();
  const jobs = await listJobs(getJobScopeForUser(user));
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
        message: buildQueueMessage(event.payload, event.message ?? "No detail")
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
        <QueueTableClient rows={rows} />
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
