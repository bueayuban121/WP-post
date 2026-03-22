import Link from "next/link";
import { ConsoleNav } from "@/components/console-nav";
import styles from "@/components/console-pages.module.css";
import { listJobs } from "@/lib/job-store";
import { getJobScopeForUser, requirePageSession } from "@/lib/auth";

function getPublishMeta(payload: Record<string, unknown> | undefined) {
  const wordpress = payload?.wordpress as Record<string, unknown> | undefined;
  const uploadErrors =
    (Array.isArray(payload?.uploadErrors) ? payload.uploadErrors : undefined) ??
    (Array.isArray(wordpress?.uploadErrors) ? wordpress.uploadErrors : undefined) ??
    [];

  return {
    link:
      (typeof payload?.link === "string" ? payload.link : undefined) ??
      (typeof wordpress?.link === "string" ? wordpress.link : undefined),
    status:
      (typeof payload?.status === "string" ? payload.status : undefined) ??
      (typeof wordpress?.status === "string" ? wordpress.status : undefined),
    id:
      (typeof payload?.id === "number" ? payload.id : undefined) ??
      (typeof wordpress?.id === "number" ? wordpress.id : undefined),
    uploadedMediaCount:
      (typeof payload?.uploadedMediaCount === "number" ? payload.uploadedMediaCount : undefined) ??
      (typeof wordpress?.uploadedMediaCount === "number" ? wordpress.uploadedMediaCount : undefined),
    uploadErrors: uploadErrors.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        placement: typeof record.placement === "string" ? record.placement : "Image",
        message: typeof record.message === "string" ? record.message : "Upload failed"
      };
    })
  };
}

export default async function PublishedPage() {
  const user = await requirePageSession();
  const jobs = await listJobs(getJobScopeForUser(user));
  const publishedItems = jobs
    .map((job) => {
      const publishEvent = [...(job.automationEvents ?? [])]
        .filter((event) => event.type === "publish" && event.status === "succeeded")
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

      return {
        job,
        publishEvent,
        meta: getPublishMeta(publishEvent?.payload)
      };
    })
    .filter((item) => item.job.stage === "published" || item.publishEvent)
    .sort((left, right) => {
      const leftTime = left.publishEvent?.updatedAt ?? "";
      const rightTime = right.publishEvent?.updatedAt ?? "";
      return rightTime.localeCompare(leftTime);
    });

  return (
    <main className={styles.page}>
      <ConsoleNav />

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Published Posts</span>
        <h1 className={styles.title}>Track every WordPress post after publish</h1>
        <p className={styles.description}>
          ตรวจสอบโพสต์ที่เผยแพร่แล้ว, เปิดลิงก์ WordPress ปลายทาง, และย้อนกลับไปแก้บทความได้จากหน้าเดียว
        </p>
      </section>

      {publishedItems.length === 0 ? (
        <section className={styles.emptyState}>
          <div className={styles.panelHead}>
            <div>
              <h2>No published posts yet</h2>
              <p>เมื่อคิว publish สำเร็จ รายการจะมาแสดงที่หน้านี้พร้อมลิงก์ WordPress และสถานะล่าสุด</p>
            </div>
            <Link className={styles.badge} href="/keywords">
              Open workflow
            </Link>
          </div>
        </section>
      ) : (
        <section className={styles.table}>
          <div className={styles.tableWrap}>
            <div className={styles.panelHead}>
              <div>
                <h2>Published history</h2>
                <p>รวมโพสต์ที่ publish ผ่านระบบ พร้อมเช็กสถานะและกลับไปแก้ต้นฉบับได้ทันที</p>
              </div>
              <div className={styles.tableMeta}>
                <strong>{publishedItems.length}</strong>
                <span>posts</span>
              </div>
            </div>

            <div className={styles.tableHead}>
              <span>Article</span>
              <span>Project</span>
              <span>Status</span>
              <span>Published</span>
              <span>Actions</span>
            </div>

            {publishedItems.map(({ job, publishEvent, meta }) => (
              <div className={styles.tableRow} key={job.id}>
                <div>
                  <strong>{job.brief.title || job.seedKeyword}</strong>
                  <span className={styles.muted}>/{job.brief.slug || "draft-slug"}</span>
                </div>
                <div>
                  <strong>{job.client}</strong>
                  <span className={styles.muted}>{job.seedKeyword}</span>
                </div>
                <div>
                  <span className={styles.pill}>{meta.status || "published"}</span>
                  {typeof meta.id === "number" ? (
                    <span className={styles.muted}>WP #{meta.id}</span>
                  ) : null}
                  {typeof meta.uploadedMediaCount === "number" ? (
                    <span className={styles.muted}>Media {meta.uploadedMediaCount}</span>
                  ) : null}
                </div>
                <div>
                  <strong>{publishEvent?.updatedAt?.slice(0, 10) || "-"}</strong>
                  <span className={styles.muted}>{publishEvent?.updatedAt?.slice(11, 19) || ""}</span>
                  {meta.uploadErrors.length > 0 ? (
                    <span className={styles.muted}>Upload issues {meta.uploadErrors.length}</span>
                  ) : null}
                </div>
                <div className={styles.actions}>
                  <Link className={styles.badge} href={`/articles?job=${job.id}`}>
                    Open article
                  </Link>
                  {meta.link ? (
                    <a className={styles.badge} href={meta.link} target="_blank" rel="noreferrer">
                      Open post
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
