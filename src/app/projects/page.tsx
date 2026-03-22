import Link from "next/link";
import { ConsoleNav } from "@/components/console-nav";
import styles from "@/components/console-pages.module.css";
import { listJobs } from "@/lib/job-store";

const stageLabels = {
  idea_pool: "Idea pool",
  selected: "Selected",
  researching: "Research ready",
  brief_ready: "Brief ready",
  drafting: "Draft ready",
  review: "In review",
  approved: "Approved",
  published: "Published"
} as const;

export default async function ProjectsPage() {
  const jobs = await listJobs();
  const projectMap = new Map<string, (typeof jobs)[number][]>();

  for (const job of jobs) {
    const current = projectMap.get(job.client) ?? [];
    current.push(job);
    projectMap.set(job.client, current);
  }

  const projects = Array.from(projectMap.entries()).map(([client, items]) => ({
    client,
    jobs: items.length,
    latestJobId: items[0]?.id ?? "",
    latestKeyword: items[0]?.seedKeyword ?? "-",
    published: items.filter((item) => item.stage === "published").length,
    latestStage: items[0]?.stage ?? "idea_pool"
  }));

  return (
    <main className={styles.page}>
      <ConsoleNav />

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Projects</span>
        <h1 className={styles.title}>Manage every content project from a single workspace</h1>
        <p className={styles.description}>
          Review how many jobs each project contains, where the latest keyword sits in the pipeline,
          and jump straight back into the next production step.
        </p>
      </section>

      <section className={styles.metrics}>
        <article className={styles.metricCard}>
          <span>Total projects</span>
          <strong>{projects.length}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Total jobs</span>
          <strong>{jobs.length}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Published jobs</span>
          <strong>{jobs.filter((job) => job.stage === "published").length}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>In progress</span>
          <strong>{jobs.filter((job) => job.stage !== "published").length}</strong>
        </article>
      </section>

      {projects.length > 0 ? (
        <section className={styles.grid}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span className={styles.eyebrow}>Project list</span>
                <h2>Active projects</h2>
                <p>Open a project by client or website, then jump back to keyword expansion or article editing.</p>
              </div>
              <Link className={styles.primaryButton} href="/keywords">
                Create project
              </Link>
            </div>

            <div className={styles.stack}>
              {projects.map((project) => (
                <article key={project.client} className={styles.projectCard}>
                  <strong>{project.client}</strong>
                  <p className={styles.muted}>Latest keyword: {project.latestKeyword}</p>
                  <div className={styles.projectMeta}>
                    <span className={styles.pill}>{project.jobs} jobs</span>
                    <span className={styles.pill}>{project.published} published</span>
                    <span className={styles.pill}>{stageLabels[project.latestStage]}</span>
                  </div>
                  <div className={styles.actions}>
                    <Link className={styles.linkButton} href={`/keywords?job=${project.latestJobId}&tab=expand`}>
                      Open keywords
                    </Link>
                    <Link className={styles.linkButton} href={`/articles?job=${project.latestJobId}`}>
                      Open article
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span className={styles.eyebrow}>Next step</span>
                <h2>Return to production flow</h2>
                <p>The core workflow still handles keyword expansion, research, article creation, and WordPress delivery.</p>
              </div>
            </div>
            <div className={styles.helperList}>
              <div className={styles.settingCard}>
                <strong>Keywords</strong>
                <p className={styles.muted}>Expand 10-15 keyword angles from one seed keyword, then choose one before research starts.</p>
              </div>
              <div className={styles.settingCard}>
                <strong>Articles</strong>
                <p className={styles.muted}>Edit the SEO brief, article draft, image set, and publish queue in one place.</p>
              </div>
              <Link className={styles.linkButton} href="/keywords">
                Open workflow
              </Link>
            </div>
          </section>
        </section>
      ) : (
        <section className={styles.emptyState}>
          <strong>No projects yet</strong>
          <p className={styles.muted}>Start by creating the first project from the main keyword workflow.</p>
          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/keywords">
              Go to workflow
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
