import Link from "next/link";
import { ConsoleNav } from "@/components/console-nav";
import styles from "@/components/console-pages.module.css";
import { listJobs } from "@/lib/job-store";

const stageLabels = {
  idea_pool: "Keyword expansion",
  selected: "Keyword selected",
  researching: "Research ready",
  brief_ready: "Brief ready",
  drafting: "Draft ready",
  review: "In review",
  approved: "Approved",
  published: "Published"
} as const;

export default async function DashboardPage() {
  const jobs = await listJobs();
  const projectCount = new Set(jobs.map((job) => job.client)).size;
  const keywordCount = jobs.length;
  const runningCount = jobs
    .flatMap((job) => job.automationEvents ?? [])
    .filter((event) => event.status === "queued" || event.status === "running").length;
  const failedCount = jobs
    .flatMap((job) => job.automationEvents ?? [])
    .filter((event) => event.status === "failed").length;
  const publishedCount = jobs.filter((job) => job.stage === "published").length;
  const recentJobs = jobs.slice(0, 5);
  const recentProjects = Array.from(
    new Map(jobs.map((job) => [job.client, job])).values()
  ).slice(0, 4);

  const n8nStatus = process.env.N8N_WEBHOOK_BASE_URL ? "Connected" : "Missing";
  const wordpressStatus = process.env.WORDPRESS_BASE_URL ? "Connected" : "Needs setup";

  return (
    <main className={styles.page}>
      <ConsoleNav />

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Dashboard</span>
        <h1 className={styles.title}>Track projects, content jobs, and delivery status in one screen</h1>
        <p className={styles.description}>
          Review active projects, keyword volume, running jobs, failed steps, and connection health
          before creating a new workflow or jumping back into production.
        </p>
      </section>

      <section className={styles.metrics}>
        <article className={styles.metricCard}>
          <span>Projects</span>
          <strong>{projectCount}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Keywords</span>
          <strong>{keywordCount}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Running jobs</span>
          <strong>{runningCount}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Failed jobs</span>
          <strong>{failedCount}</strong>
        </article>
      </section>

      <section className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.eyebrow}>System</span>
              <h2>Connection status</h2>
              <p>Confirm that automation and publishing are ready before launching new work.</p>
            </div>
            <Link className={styles.primaryButton} href="/keywords">
              Create job
            </Link>
          </div>

          <div className={styles.stack}>
            <article className={styles.statusCard}>
              <strong>n8n automation</strong>
              <div className={styles.projectMeta}>
                <span className={styles.pill}>{n8nStatus}</span>
              </div>
            </article>
            <article className={styles.statusCard}>
              <strong>WordPress publish</strong>
              <div className={styles.projectMeta}>
                <span className={styles.pill}>{wordpressStatus}</span>
              </div>
            </article>
            <article className={styles.statusCard}>
              <strong>Published posts</strong>
              <div className={styles.projectMeta}>
                <span className={styles.pill}>{publishedCount} live</span>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.eyebrow}>Recent projects</span>
              <h2>Continue from the latest workspace</h2>
              <p>Jump back into the latest project to expand keywords, run research, or edit the article.</p>
            </div>
          </div>

          <div className={styles.stack}>
            {recentProjects.length > 0 ? (
              recentProjects.map((project) => (
                <article key={project.id} className={styles.projectCard}>
                  <strong>{project.client}</strong>
                  <p className={styles.muted}>Seed keyword: {project.seedKeyword}</p>
                  <div className={styles.projectMeta}>
                    <span className={styles.pill}>{stageLabels[project.stage]}</span>
                  </div>
                  <div className={styles.actions}>
                    <Link className={styles.linkButton} href={`/keywords?job=${project.id}&tab=expand`}>
                      Open workflow
                    </Link>
                    <Link className={styles.linkButton} href={`/articles?job=${project.id}`}>
                      Open article
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <section className={styles.emptyState}>
                <div>
                  <strong>No projects yet</strong>
                  <p className={styles.muted}>Create the first project from the Keywords workspace.</p>
                </div>
                <div className={styles.actions}>
                  <Link className={styles.primaryButton} href="/keywords">
                    Go to keywords
                  </Link>
                </div>
              </section>
            )}
          </div>
        </section>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <span className={styles.eyebrow}>Recent jobs</span>
            <h2>Latest content workflow activity</h2>
            <p>See which step finished last, then jump back to keywords, research, articles, or queue.</p>
          </div>
        </div>

        {recentJobs.length > 0 ? (
          <div className={styles.stack}>
            {recentJobs.map((job) => (
              <article key={job.id} className={styles.projectCard}>
                <strong>{job.seedKeyword}</strong>
                <p className={styles.muted}>{job.client}</p>
                <div className={styles.projectMeta}>
                  <span className={styles.pill}>{stageLabels[job.stage]}</span>
                  <span className={styles.pill}>{job.automationEvents?.length ?? 0} events</span>
                </div>
                <div className={styles.actions}>
                  <Link className={styles.linkButton} href={`/keywords?job=${job.id}&tab=expand`}>
                    Keywords
                  </Link>
                  <Link className={styles.linkButton} href={`/keywords?job=${job.id}&tab=research`}>
                    Research
                  </Link>
                  <Link className={styles.linkButton} href={`/articles?job=${job.id}`}>
                    Article
                  </Link>
                  <Link className={styles.linkButton} href="/queue">
                    Queue
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className={styles.emptyState}>
            <div>
              <strong>No jobs yet</strong>
              <p className={styles.muted}>Create the first project and jobs will start appearing here.</p>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
