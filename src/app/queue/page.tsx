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
  const seoMeta = wordpress?.seoMeta as Record<string, unknown> | undefined;
  const seoWarnings = Array.isArray(seoMeta?.warnings) ? seoMeta.warnings : [];

  if (provider) {
    parts.push(`Provider: ${provider}`);
  }

  if (typeof uploadedMediaCount === "number") {
    parts.push(`Media uploaded: ${uploadedMediaCount}`);
  }

  if (uploadErrors && uploadErrors.length > 0) {
    parts.push(`Upload issues: ${uploadErrors.length}`);
  }

  if (typeof seoMeta?.attempted === "boolean" && seoMeta.attempted) {
    parts.push(typeof seoMeta?.synced === "boolean" && seoMeta.synced ? "SEO meta synced" : "SEO meta not synced");
  }

  if (seoWarnings.length > 0) {
    parts.push(`SEO warnings: ${seoWarnings.length}`);
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
          à¸”à¸¹à¹„à¸”à¹‰à¸—à¸±à¸™à¸—à¸µà¸§à¹ˆà¸²à¸‡à¸²à¸™à¹„à¸«à¸™à¸à¸³à¸¥à¸±à¸‡à¸„à¸´à¸§ à¸‡à¸²à¸™à¹„à¸«à¸™à¸ªà¸³à¹€à¸£à¹‡à¸ˆ à¸‡à¸²à¸™à¹„à¸«à¸™à¸¥à¹‰à¸¡à¹€à¸«à¸¥à¸§ à¹à¸¥à¸°à¸£à¸°à¸šà¸šà¹„à¸«à¸™à¹€à¸›à¹‡à¸™à¸„à¸™à¸£à¸±à¸™ à¹€à¸žà¸·à¹ˆà¸­à¹à¸à¹‰à¸›à¸±à¸à¸«à¸²à¹„à¸”à¹‰à¹€à¸£à¹‡à¸§à¸‚à¸¶à¹‰à¸™à¹€à¸§à¸¥à¸²à¸—à¸³à¸‡à¸²à¸™à¸ˆà¸£à¸´à¸‡
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
          <strong>à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µ queue event</strong>
          <p className={styles.muted}>à¹€à¸¡à¸·à¹ˆà¸­à¹€à¸£à¸´à¹ˆà¸¡à¸£à¸±à¸™ research, draft à¸«à¸£à¸·à¸­ publish à¸‡à¸²à¸™à¸ˆà¸°à¹€à¸£à¸´à¹ˆà¸¡à¹€à¸‚à¹‰à¸²à¸¡à¸²à¹à¸ªà¸”à¸‡à¹ƒà¸™à¸«à¸™à¹‰à¸²à¸™à¸µà¹‰</p>
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
