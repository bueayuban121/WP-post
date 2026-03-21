"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "./console-pages.module.css";
import type { WorkflowAutomationStatus, WorkflowAutomationType } from "@/types/workflow";

type QueueRow = {
  id: string;
  jobId: string;
  project: string;
  keyword: string;
  type: WorkflowAutomationType;
  status: WorkflowAutomationStatus;
  source: "app" | "n8n";
  updatedAt: string;
  message: string;
};

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

export function QueueTableClient({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeRetryId, setActiveRetryId] = useState("");
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  function retry(row: QueueRow) {
    setActiveRetryId(row.id);
    setFeedback((current) => ({ ...current, [row.id]: "" }));

    startTransition(async () => {
      try {
        const response = await fetch(`/api/jobs/${row.jobId}/automation/${row.type}`, {
          method: "POST"
        });

        const data = (await response.json()) as { error?: string; automation?: { message?: string } };
        if (!response.ok) {
          throw new Error(data.error ?? "Retry failed.");
        }

        setFeedback((current) => ({
          ...current,
          [row.id]: data.automation?.message ?? "Queued again"
        }));
        router.refresh();
      } catch (error) {
        setFeedback((current) => ({
          ...current,
          [row.id]: error instanceof Error ? error.message : "Retry failed."
        }));
      } finally {
        setActiveRetryId("");
      }
    });
  }

  return (
    <section className={styles.table}>
      <div className={styles.tableHead}>
        <span>Project</span>
        <span>Keyword</span>
        <span>Action</span>
        <span>Status</span>
        <span>Updated</span>
      </div>
      {rows.map((row) => {
        const isRetrying = isPending && activeRetryId === row.id;

        return (
          <div key={row.id} className={styles.tableRow}>
            <div>
              <strong>{row.project}</strong>
              <small>{row.source.toUpperCase()}</small>
            </div>
            <div>
              <strong>{row.keyword}</strong>
              <small>{feedback[row.id] || row.message}</small>
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
                <button
                  className={styles.linkButton}
                  disabled={isRetrying}
                  onClick={() => retry(row)}
                  type="button"
                >
                  {isRetrying ? "Retrying..." : "Retry"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
