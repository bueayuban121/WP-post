"use client";

import { type FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import { workflowStages } from "@/data/mock-workflow";
import { WorkflowAutomationType, WorkflowJob } from "@/types/workflow";
import styles from "./workflow-dashboard.module.css";

export function WorkflowDashboard() {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string>("");
  const [client, setClient] = useState("AquaCare Thailand");
  const [seedKeyword, setSeedKeyword] = useState("ปลาทอง");
  const [error, setError] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState("Loading content jobs...");
  const [isPending, startTransition] = useTransition();
  const job = jobs.find((item) => item.id === activeJobId) ?? jobs[0] ?? null;
  const kpiCards = [
    {
      label: "Ideas generated",
      value: jobs.reduce((total, current) => total + current.ideas.length, 0).toString(),
      note: `${jobs.length} content jobs currently in the pipeline`
    },
    {
      label: "Research packs ready",
      value: jobs.filter((current) => current.stage !== "idea_pool").length.toString(),
      note: "Jobs with an idea selected and research prepared"
    },
    {
      label: "Drafts in review",
      value: jobs.filter((current) => ["drafting", "review"].includes(current.stage)).length.toString(),
      note: "Drafts progressing toward editorial review"
    }
  ];

  const loadJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load jobs.");
      }

      const data = (await response.json()) as { jobs: WorkflowJob[] };
      setJobs(data.jobs);
      if (data.jobs[0]) {
        setActiveJobId((current) => current || data.jobs[0].id);
        setStatusMessage(`Loaded ${data.jobs.length} content job${data.jobs.length === 1 ? "" : "s"}.`);
      } else {
        setStatusMessage("No content jobs yet. Create your first one from the hero form.");
      }
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load jobs.");
      setStatusMessage("Could not load content jobs.");
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
      throw new Error(data.error ?? "Request failed.");
    }

    setJobs((current) =>
      current.some((item) => item.id === data.job?.id)
        ? current.map((item) => (item.id === data.job?.id ? data.job : item))
        : [data.job, ...current]
    );
    setActiveJobId(data.job.id);
    setStatusMessage(successMessage ?? "Content job updated.");
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
          automation?: { accepted: boolean; message?: string };
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to queue automation.");
        }

        if (data.job) {
          setJobs((current) =>
            current.map((item) => (item.id === data.job?.id ? data.job : item))
          );
          setActiveJobId(data.job.id);
        } else {
          await loadJobs();
        }

        setError("");
        setStatusMessage(
          data.automation?.message
            ? `${type} automation: ${data.automation.message}`
            : `${type} automation queued.`
        );
      } catch (automationError) {
        setError(
          automationError instanceof Error ? automationError.message : "Failed to queue automation."
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
          `Created a new job for ${client}.`
        );
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "Failed to create job.");
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
        setError(actionError instanceof Error ? actionError.message : "Failed to update job.");
      }
    });
  }

  if (!job) {
    return (
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>SEO Content Operating System</span>
            <h1>Create the first content job to start the keyword workflow.</h1>
            <p>
              This round is focused on the app layer: real job creation form, API routes, and
              in-memory pipeline state. PostgreSQL and Prisma are already scaffolded next.
            </p>
            <form className={styles.intakeForm} onSubmit={handleCreateJob}>
              <label>
                Client
                <input value={client} onChange={(event) => setClient(event.target.value)} />
              </label>
              <label>
                Seed keyword
                <input
                  value={seedKeyword}
                  onChange={(event) => setSeedKeyword(event.target.value)}
                />
              </label>
              <button className={styles.primaryButton} disabled={isPending} type="submit">
                {isPending ? "Creating..." : "Create First Content Job"}
              </button>
            </form>
            <p className={styles.statusText}>{error || statusMessage}</p>
          </div>
        </section>
      </main>
    );
  }

  const selectedIdea = job.ideas.find((idea) => idea.id === job.selectedIdeaId) ?? job.ideas[0];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>SEO Content Operating System</span>
          <h1>Turn one keyword into client-approved blog content with traceable research.</h1>
          <p>
            This MVP is designed for the workflow you described: keyword expansion, client topic
            selection, Thai and global research, content brief creation, draft writing, and
            publishing handoff through n8n.
          </p>
          <form className={styles.intakeForm} onSubmit={handleCreateJob}>
            <div className={styles.formGrid}>
              <label>
                Client
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
                {isPending ? "Creating..." : "Create New Content Job"}
              </button>
              <button className={styles.secondaryButton} type="button" onClick={() => void loadJobs()}>
                Refresh Jobs
              </button>
            </div>
          </form>
          <p className={styles.statusText}>{error || statusMessage}</p>
        </div>
        <aside className={styles.heroPanel}>
          <p className={styles.panelLabel}>Current client job</p>
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
          <span className={styles.seedKeyword}>Seed keyword: {job.seedKeyword}</span>
          <div className={styles.stagePill}>{job.stage.replace("_", " ")}</div>
          <ul className={styles.miniChecklist}>
            <li>Keyword expanded into opportunity pool</li>
            <li>Client selected article direction</li>
            <li>Research pack combined from TH + Global sources</li>
            <li>Brief ready for editorial approval</li>
          </ul>
          <div className={styles.eventSummary}>
            <span className={styles.infoLabel}>Latest automation events</span>
            <ul className={styles.eventList}>
              {(job.automationEvents?.slice(0, 3) ?? []).map((event) => (
                <li key={event.id} className={styles.eventItem}>
                  <span className={styles.eventType}>{event.type}</span>
                  <span className={styles.eventStatus}>{event.status}</span>
                </li>
              ))}
              {!job.automationEvents?.length ? (
                <li className={styles.eventEmpty}>No automation activity yet.</li>
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

      <section className={styles.pipelineSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Pipeline view</span>
            <h2>Operational flow for client work</h2>
          </div>
          <p>
            The front end keeps humans in control. n8n should automate the transitions after each
            approval, not replace the app state.
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
              Reload jobs
            </button>
          </div>
          <p className={styles.cardLead}>
            Start from one seed keyword, then generate content opportunities that clients can
            actually approve.
          </p>
          <div className={styles.seedBox}>
            <label htmlFor="seedKeyword">Seed keyword</label>
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
              <h3>Research pack</h3>
            </div>
            <div className={styles.inlineActions}>
              <button
                className={styles.textButton}
                onClick={() =>
                  updateJob(`/api/jobs/${job.id}/research`, `Research pack refreshed for ${job.client}.`)
                }
                type="button"
              >
                Generate locally
              </button>
              <button
                className={styles.textButton}
                onClick={() => void runAutomation("research")}
                type="button"
              >
                Queue in n8n
              </button>
            </div>
          </div>
          <p className={styles.cardLead}>{job.research.objective}</p>
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
                Generate locally
              </button>
              <button
                className={styles.textButton}
                onClick={() => void runAutomation("brief")}
                type="button"
              >
                Queue in n8n
              </button>
            </div>
          </div>
          <div className={styles.briefHeader}>
            <h4>{job.brief.title}</h4>
            <p>{job.brief.angle}</p>
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
              <h3>Draft article workspace</h3>
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
              <span className={styles.infoLabel}>Automation checkpoints</span>
              <ul className={styles.bulletList}>
                <li>n8n webhook receives approved brief</li>
                <li>Research trace saved to database before generation</li>
                <li>WordPress publish node waits for final approval</li>
                <li>Telegram notification fires after publish or failure</li>
              </ul>
              <div className={styles.inlineActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => void runAutomation("publish")}
                  type="button"
                >
                  Queue Publish in n8n
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => void loadJobs()}
                  type="button"
                >
                  Refresh events
                </button>
              </div>
              <div className={styles.eventPanel}>
                <strong>Workflow event log</strong>
                <ul className={styles.eventTimeline}>
                  {(job.automationEvents ?? []).map((event) => (
                    <li key={event.id} className={styles.timelineItem}>
                      <div className={styles.timelineTop}>
                        <span className={styles.eventType}>{event.type}</span>
                        <span className={styles.eventStatus}>{event.status}</span>
                      </div>
                      <p>{event.message ?? "No message from automation yet."}</p>
                    </li>
                  ))}
                  {!job.automationEvents?.length ? (
                    <li className={styles.eventEmpty}>Queue a workflow to start tracking automation runs.</li>
                  ) : null}
                </ul>
              </div>
              <div className={styles.sourceCard}>
                <strong>Recommended next build step</strong>
                <p>
                  Persist jobs in PostgreSQL, then wire `approve brief` and `publish` buttons into
                  backend endpoints that trigger n8n webhooks.
                </p>
              </div>
            </aside>
          </div>
        </article>
      </section>
    </main>
  );
}
