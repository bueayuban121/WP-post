"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./console-pages.module.css";
import type { WorkflowJob } from "@/types/workflow";

type PendingAction = "" | "generate" | "save" | "publish";

async function readJson(response: Response) {
  const data = (await response.json()) as { error?: string; jobs?: WorkflowJob[]; job?: WorkflowJob };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

export function FacebookPage({ initialJobId = "" }: { initialJobId?: string }) {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [activeJobId, setActiveJobId] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [selectedImageId, setSelectedImageId] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>("");
  const [statusMessage, setStatusMessage] = useState("Loading Facebook workspace");
  const [error, setError] = useState("");

  const activeJob = useMemo(
    () => jobs.find((job) => job.id === activeJobId) ?? jobs[0] ?? null,
    [activeJobId, jobs]
  );

  const loadJobs = useCallback(async () => {
    try {
      setStatusMessage("Loading Facebook workspace");
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const data = await readJson(response);
      const nextJobs = data.jobs ?? [];
      setJobs(nextJobs);
      setActiveJobId(nextJobs.find((job) => job.id === initialJobId)?.id ?? nextJobs[0]?.id ?? "");
      setError("");
      setStatusMessage(nextJobs.length ? "Facebook workspace ready" : "No article jobs yet");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed.");
      setStatusMessage("Load failed");
    }
  }, [initialJobId]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!activeJob) return;
    setCaption(activeJob.facebook.caption);
    setHashtags(activeJob.facebook.hashtags.join(" "));
    setSelectedImageId(activeJob.facebook.selectedImageId || activeJob.images[0]?.id || "");
  }, [activeJob]);

  function replaceJob(nextJob: WorkflowJob, message: string) {
    setJobs((current) =>
      current.some((job) => job.id === nextJob.id)
        ? current.map((job) => (job.id === nextJob.id ? nextJob : job))
        : [nextJob, ...current]
    );
    setActiveJobId(nextJob.id);
    setCaption(nextJob.facebook.caption);
    setHashtags(nextJob.facebook.hashtags.join(" "));
    setSelectedImageId(nextJob.facebook.selectedImageId || nextJob.images[0]?.id || "");
    setStatusMessage(message);
    setError("");
  }

  async function generatePost() {
    if (!activeJob) return;
    setPendingAction("generate");

    try {
      const response = await fetch(`/api/jobs/${activeJob.id}/facebook/generate`, { method: "POST" });
      const data = await readJson(response);
      if (!data.job) throw new Error("Job payload missing.");
      replaceJob(data.job, "Facebook caption generated");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Generate failed.");
    } finally {
      setPendingAction("");
    }
  }

  async function savePost() {
    if (!activeJob) return;
    setPendingAction("save");

    try {
      const response = await fetch(`/api/jobs/${activeJob.id}/facebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          hashtags: hashtags
            .split(/\s+/)
            .map((tag) => tag.trim())
            .filter(Boolean),
          selectedImageId,
          status: "draft"
        })
      });
      const data = await readJson(response);
      if (!data.job) throw new Error("Job payload missing.");
      replaceJob(data.job, "Facebook draft saved");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Save failed.");
    } finally {
      setPendingAction("");
    }
  }

  async function queuePublish() {
    if (!activeJob) return;
    setPendingAction("publish");

    try {
      const saveResponse = await fetch(`/api/jobs/${activeJob.id}/facebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          hashtags: hashtags
            .split(/\s+/)
            .map((tag) => tag.trim())
            .filter(Boolean),
          selectedImageId,
          status: "queued"
        })
      });
      const saveData = await readJson(saveResponse);
      if (saveData.job) {
        replaceJob(saveData.job, "Facebook draft queued");
      }

      const response = await fetch(`/api/jobs/${activeJob.id}/facebook/publish`, { method: "POST" });
      const data = await readJson(response);
      if (!data.job) throw new Error("Job payload missing.");
      replaceJob(data.job, "Facebook workflow queued");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Facebook queue failed.");
    } finally {
      setPendingAction("");
    }
  }

  const selectedImage =
    activeJob?.images.find((image) => image.id === selectedImageId) ??
    activeJob?.images[0] ??
    null;

  return (
    <section className={styles.grid}>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <span className={styles.eyebrow}>Facebook Compose</span>
            <h2>Summarize the article into a ready-to-post Facebook caption</h2>
            <p>เลือกบทความ สร้าง caption จากเนื้อหาจริง เลือกรูป แล้วค่อยส่งเข้ากระบวนการโพสต์ Facebook</p>
          </div>
          <span className={styles.badge}>{statusMessage}</span>
        </div>

        {jobs.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.panelHead}>
              <div>
                <h2>No article jobs yet</h2>
                <p>สร้างบทความให้เสร็จก่อน แล้วค่อยนำมาสรุปเป็นโพสต์ Facebook</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.form}>
            <label>
              Article job
              <small>เลือกงานที่ต้องการนำไปย่อเป็นโพสต์ Facebook</small>
              <select value={activeJob?.id ?? ""} onChange={(event) => setActiveJobId(event.target.value)}>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.brief.title || job.seedKeyword}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Facebook caption
              <small>สรุปจากบทความจริงให้อ่านง่าย เหมาะกับโพสต์เพจ</small>
              <textarea rows={10} value={caption} onChange={(event) => setCaption(event.target.value)} />
            </label>

            <label>
              Hashtags
              <small>คั่นด้วยเว้นวรรค เช่น #CoffeeShop #Bangkok</small>
              <textarea rows={3} value={hashtags} onChange={(event) => setHashtags(event.target.value)} />
            </label>

            <div className={styles.actions}>
              <button className={styles.linkButton} disabled={!activeJob || Boolean(pendingAction)} onClick={() => void generatePost()} type="button">
                {pendingAction === "generate" ? "Generating..." : "Generate Facebook Post"}
              </button>
              <button className={styles.linkButton} disabled={!activeJob || Boolean(pendingAction)} onClick={() => void savePost()} type="button">
                {pendingAction === "save" ? "Saving..." : "Save Draft"}
              </button>
              <button className={styles.primaryButton} disabled={!activeJob || Boolean(pendingAction)} onClick={() => void queuePublish()} type="button">
                {pendingAction === "publish" ? "Queueing..." : "Queue Facebook Post"}
              </button>
            </div>

            {error ? <span className={styles.muted}>{error}</span> : null}
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <span className={styles.eyebrow}>Image Picker</span>
            <h2>Choose the image for Facebook</h2>
            <p>เลือกรูปจากชุดภาพของบทความ แล้วส่งรูปนั้นไปกับ Facebook workflow</p>
          </div>
          {activeJob ? <span className={styles.badge}>{activeJob.facebook.status}</span> : null}
        </div>

        {selectedImage ? (
          <div className={styles.stack}>
            <div className={styles.projectCard}>
              <Image
                alt={selectedImage.alt}
                height={760}
                src={selectedImage.src}
                style={{ width: "100%", height: "auto", borderRadius: "16px" }}
                unoptimized
                width={1200}
              />
            </div>

            <div className={styles.list}>
              {(activeJob?.images ?? []).map((image) => (
                <label className={styles.projectCard} key={image.id}>
                  <div className={styles.actions}>
                    <input
                      checked={selectedImageId === image.id}
                      name="facebook-image"
                      onChange={() => setSelectedImageId(image.id)}
                      type="radio"
                    />
                    <strong>{image.caption}</strong>
                  </div>
                  <p className={styles.muted}>{image.alt}</p>
                  <span className={styles.pill}>{image.placement}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.panelHead}>
              <div>
                <h2>No images yet</h2>
                <p>สร้างภาพของบทความก่อน แล้วค่อยเลือกภาพสำหรับโพสต์ Facebook</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}
